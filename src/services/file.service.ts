import { ErrorCode } from '../constants/error-code.js';
import { UPLOAD_CONFIG } from '../constants/upload.constant.js';
import type { FileUploadDto } from '../types/upload.type.js';
import AppError from '../utils/app-error.js';
import { cloudinaryService, CloudinaryService } from './cloudinary.service.js';
import { localStorageService, LocalStorageService } from './local-storage.service.js';

type DynamicImporter = (specifier: string) => Promise<any>;

export type ProcessedDocument = {
  name: string;
  mime: string;
  url?: string;
  size?: number;
  text: string;
};

export type ProcessedDocumentsResult = {
  documents: ProcessedDocument[];
  fileUploads: FileUploadDto[];
};

export type BufferedUploadedFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size?: number;
};

const importModule = new Function('specifier', 'return import(specifier)') as DynamicImporter;
const maxDocumentChars = 12000;
const maxFileBytes = UPLOAD_CONFIG.MAX_FILE_SIZE;


//TODO: Bkav HoanNTh: file.service.ts chỉ xử lý logic liên quan đến file, việc xử lý promt không phải ở đây
//FIXME: Bkav VinhTQ: Done

export class FileService {
  constructor(
    private readonly localStorage: LocalStorageService = localStorageService,
    private readonly cloudinaryStorage: CloudinaryService = cloudinaryService
  ) {}

  /**
   * Tải các file từ local storage hoặc Cloudinary và trích xuất nội dung văn bản.
   */
  async processFilesFromUrls(fileUploads: FileUploadDto[] = []): Promise<ProcessedDocumentsResult> {
    if (!fileUploads.length) {
      return {
        documents: [],
        fileUploads: [],
      };
    }

    const bufferedFiles = await Promise.all(
      fileUploads.map(async (file) => {
        try {
          this.assertFileSize(file.size);
          const localBuffer = await this.localStorage.readFileFromUrl(file.data);
          const buffer = localBuffer ?? await this.cloudinaryStorage.fetchFileBuffer(file.data);

          return {
            originalname: file.name,
            mimetype: file.mime,
            buffer: buffer,
            size: buffer.length
          } as BufferedUploadedFile;
        } catch (error) {
          throw new AppError(
            ErrorCode.BAD_REQUEST,
            `Không thể tải tệp tin: ${file.name}. Chi tiết: ${error instanceof Error ? error.message : 'Unknown'}`
          );
        }
      })
    );

    const documents = await Promise.all(bufferedFiles.map(async (file, index) => {
      const text = await this.extractText(file);
      this.assertDocumentTextLength(file.originalname, text);

      return {
        name: file.originalname,
        mime: file.mimetype,
        size: file.size,
        url: fileUploads[index].data, // Lấy lại URL gốc của Cloudinary, không cần upload lại [INDEX]
        text,
      };
    }));

    return {
      documents,
      fileUploads, // Trả lại nguyên vẹn mảng URL ban đầu cho Controller
    };
  }

  /**
   * Đảm bảo kích thước file không vượt quá giới hạn hệ thống cho phép.
   */
  private assertFileSize(size?: number): void {
    if (typeof size === 'number' && size > maxFileBytes) {
      throw new Error(`File exceeds ${this.formatBytes(maxFileBytes)}`);
    }
  }

  /**
   * Chuyển số byte thành chuỗi MB để hiển thị trong thông báo lỗi.
   */
  private formatBytes(bytes: number): string {
    return `${Math.floor(bytes / 1024 / 1024)}MB`;
  }

  /**
   * Chọn bộ xử lý phù hợp để trích xuất văn bản dựa trên loại file.
   */
  private async extractText(file: BufferedUploadedFile): Promise<string> {
    if (this.isPlainText(file)) {
      return file.buffer.toString('utf8');
    }

    if (file.mimetype === 'application/pdf') {
      return this.extractPdfText(file);
    }

    if (this.isDocx(file)) {
      return this.extractDocxText(file);
    }

    if (this.isSpreadsheet(file)) {
      return this.extractSpreadsheetText(file);
    }

    throw new AppError(
      ErrorCode.BAD_REQUEST,
      `Unsupported file type: ${file.originalname}`
    );
  }

  /**
   * Kiểm tra MIME type có thuộc nhóm file văn bản đọc trực tiếp được hay không.
   */
  private isPlainText(file: BufferedUploadedFile): boolean {
    return file.mimetype === 'text/plain'
      || file.originalname.toLowerCase().endsWith('.txt');
  }

  /**
   * Kiểm tra file có phải bảng tính Excel dựa trên MIME type hoặc phần mở rộng.
   */
  private isSpreadsheet(file: BufferedUploadedFile): boolean {
    return file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      || file.mimetype === 'application/vnd.ms-excel'
      || file.originalname.toLowerCase().endsWith('.xlsx')
      || file.originalname.toLowerCase().endsWith('.xls');
  }

  /**
   * Kiểm tra file có phải tài liệu Word Open XML hay không.
   */
  private isDocx(file: BufferedUploadedFile): boolean {
    return file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      || file.originalname.toLowerCase().endsWith('.docx');
  }

  /**
   * Trích xuất văn bản thuần từ tài liệu DOCX bằng mammoth.
   */
  private async extractDocxText(file: BufferedUploadedFile): Promise<string> {
    const mammoth = await this.loadOptionalPackage('mammoth');
    const extractRawText = mammoth.extractRawText ?? mammoth.default?.extractRawText;

    if (typeof extractRawText !== 'function') {
      throw new AppError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Unsupported mammoth package API'
      );
    }

    const result = await extractRawText({ buffer: file.buffer });
    return result.value ?? '';
  }

  /**
   * Trích xuất văn bản từ file PDF bằng thư viện pdf-parse.
   */
  private async extractPdfText(file: BufferedUploadedFile): Promise<string> {
    const pdfParse = await this.loadOptionalPackage('pdf-parse');
    const parsePdf = pdfParse.default ?? pdfParse;

    if (typeof parsePdf === 'function') {
      const result = await parsePdf(file.buffer);
      return result.text ?? '';
    }

    if (typeof pdfParse.PDFParse === 'function') {
      const parser = new pdfParse.PDFParse({ data: file.buffer });

      try {
        const result = await parser.getText();
        return result.text ?? '';
      } finally {
        await parser.destroy();
      }
    }

    throw new AppError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Unsupported pdf-parse package API'
    );
  }

  /**
   * Trích xuất nội dung các sheet trong file Excel và chuyển thành văn bản CSV.
   */
  private async extractSpreadsheetText(file: BufferedUploadedFile): Promise<string> {
    const xlsx = await this.loadOptionalPackage('xlsx');
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });

    return workbook.SheetNames
      .map((sheetName: string) => {
        const sheet = workbook.Sheets[sheetName];
        const csv = xlsx.utils.sheet_to_csv(sheet);
        return `Sheet: ${sheetName}\n${csv}`;
      })
      .join('\n\n');
  }

  /**
   * Nạp thư viện parser khi cần dùng và báo lỗi rõ ràng nếu package bị thiếu.
   */
  private async loadOptionalPackage(packageName: string): Promise<any> {
    try {
      return await importModule(packageName);
    } catch {
      throw new AppError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        `Missing document parser package: ${packageName}`
      );
    }
  }

  /**
   * Báo lỗi rõ ràng nếu nội dung trích xuất vượt quá giới hạn ký tự.
   */
  private assertDocumentTextLength(fileName: string, text: string): void {
    if (text.length <= maxDocumentChars) return;

    throw new AppError(
      ErrorCode.BAD_REQUEST,
      `File "${fileName}" exceeds the ${maxDocumentChars.toLocaleString()} character limit. Please upload a shorter file.`
    );
  }
}
