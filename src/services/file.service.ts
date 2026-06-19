import { v2 as cloudinary } from 'cloudinary';
import env from '../config/env.js';
import { ErrorCode } from '../constants/error-code.js';
import type { FileUploadDto } from '../types/upload.type.js';
import AppError from '../utils/app-error.js';

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
  promptContext: string;
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
const maxPromptContextChars = 30000;
const maxFileBytes = 10 * 1024 * 1024;
const allowedCloudinaryResourceTypes = new Set(['image', 'raw']);

export class DocumentFileService {
  /**
   * Khởi tạo cấu hình Cloudinary nếu server có đủ thông tin xác thực.
   */
  constructor() {
    if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
      });
    }
  }

  /**
   * Tải các file từ URL Cloudinary, trích xuất nội dung văn bản và tạo context cho prompt.
   */
  async processFilesFromUrls(fileUploads: FileUploadDto[] = []): Promise<ProcessedDocumentsResult> {
    if (!fileUploads.length) {
      return {
        documents: [],
        promptContext: '',
        fileUploads: [],
      };
    }

    const bufferedFiles = await Promise.all(
      fileUploads.map(async (file) => {
        try {
          this.assertFileSize(file.size);
          const response = await this.fetchCloudFile(file.data);
          if (!response.ok) {
            throw new Error(`HTTP status ${response.status}`);
          }

          const buffer = await this.readResponseBuffer(response);

          return {
            originalname: file.name,
            mimetype: file.mime,
            buffer: buffer,
            size: buffer.length
          } as BufferedUploadedFile;
        } catch (error) {
          throw new AppError(
            ErrorCode.BAD_REQUEST,
            `Không thể tải tệp tin từ đám mây: ${file.name}. Chi tiết: ${error instanceof Error ? error.message : 'Unknown'}`
          );
        }
      })
    );

    const documents = await Promise.all(bufferedFiles.map(async (file, index) => ({
      name: file.originalname,
      mime: file.mimetype,
      size: file.size,
      url: fileUploads[index].data, // Lấy lại URL gốc của Cloudinary, không cần upload lại [INDEX]
      text: this.truncateText(await this.extractText(file), maxDocumentChars),
    })));

    return {
      documents,
      promptContext: this.createPromptContext(documents),
      fileUploads, // Trả lại nguyên vẹn mảng URL ban đầu cho Controller
    };
  }

  /**
   * Tải file từ Cloudinary, thử lại bằng signed URL nếu URL công khai không truy cập được.
   */
  private async fetchCloudFile(url: string): Promise<Response> {
    const parsedUrl = this.parseAllowedCloudinaryUrl(url);
    const response = await fetch(parsedUrl.toString());
    if (response.ok) {
      return response;
    }

    const signedUrl = this.generateSignedUrl(parsedUrl);
    if (!signedUrl) {
      return response;
    }

    return fetch(signedUrl);
  }

  /**
   * Kiểm tra URL Cloudinary hợp lệ và thuộc đúng cloud đã cấu hình.
   */
  private parseAllowedCloudinaryUrl(url: string): URL {
    try {
      const parsedUrl = new URL(url);
      const cloudName = env.CLOUDINARY_CLOUD_NAME;
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);

      if (parsedUrl.protocol !== 'https:') {
        throw new Error('Only HTTPS Cloudinary URLs are allowed');
      }

      if (parsedUrl.hostname !== 'res.cloudinary.com') {
        throw new Error('Only Cloudinary delivery URLs are allowed');
      }

      if (!cloudName || pathParts[0] !== cloudName) {
        throw new Error('Cloudinary cloud does not match server configuration');
      }

      if (!allowedCloudinaryResourceTypes.has(pathParts[1]) || pathParts[2] !== 'upload') {
        throw new Error('Unsupported Cloudinary delivery URL');
      }

      return parsedUrl;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Invalid Cloudinary URL', { cause: error });
    }
  }

  /**
   * Tạo signed URL cho tài nguyên raw để đọc các file cần quyền truy cập có chữ ký.
   */
  private generateSignedUrl(parsedUrl: URL): string | null {
    const pathname = parsedUrl.pathname.replace('/image/upload/', '/raw/upload/');
    const urlParts = pathname.split('/upload/');
    if (urlParts.length < 2) return null;

    const publicId = urlParts[1].replace(/^v\d+\//, '');

    return cloudinary.url(publicId, {
      resource_type: 'raw',
      type: 'upload',
      sign_url: true,
      secure: true,
    });
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
   * Đọc response stream thành Buffer và dừng đọc nếu dữ liệu vượt quá giới hạn.
   */
  private async readResponseBuffer(response: Response): Promise<Buffer> {
    const contentLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(contentLength)) {
      this.assertFileSize(contentLength);
    }

    if (!response.body) {
      throw new Error('Response body is unreadable');
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;

        receivedBytes += value.byteLength;
        if (receivedBytes > maxFileBytes) {
          await reader.cancel();
          throw new Error(`File exceeds ${this.formatBytes(maxFileBytes)}`);
        }

        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    return Buffer.concat(
      chunks.map((chunk) => Buffer.from(chunk)),
      receivedBytes
    );
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
    if (this.isPlainText(file.mimetype)) {
      return file.buffer.toString('utf8');
    }

    if (file.mimetype === 'application/pdf') {
      return this.extractPdfText(file);
    }

    if (this.isSpreadsheet(file)) {
      return this.extractSpreadsheetText(file);
    }

    if (this.isWordDocument(file)) {
      return this.extractWordText(file);
    }

    throw new AppError(
      ErrorCode.BAD_REQUEST,
      `Unsupported file type: ${file.originalname}`
    );
  }

  /**
   * Kiểm tra MIME type có thuộc nhóm file văn bản đọc trực tiếp được hay không.
   */
  private isPlainText(mime: string): boolean {
    return mime.startsWith('text/')
      || mime === 'application/json'
      || mime === 'application/xml'
      || mime === 'application/csv'
      || mime === 'text/markdown';
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
   * Kiểm tra file có phải tài liệu Word dựa trên MIME type hoặc phần mở rộng.
   */
  private isWordDocument(file: BufferedUploadedFile): boolean {
    return file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      || file.originalname.toLowerCase().endsWith('.docx');
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
   * Trích xuất văn bản thô từ file Word bằng thư viện mammoth.
   */
  private async extractWordText(file: BufferedUploadedFile): Promise<string> {
    const mammoth = await this.loadOptionalPackage('mammoth');
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value ?? '';
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
   * Ghép nội dung các tài liệu thành prompt context dùng cho AI.
   */
  private createPromptContext(documents: ProcessedDocument[]): string {
    const context = documents
      .map((document, index) => [
        `File ${index + 1}: ${document.name}`,
        `MIME: ${document.mime}`,
        ...(document.url ? [`URL: ${document.url}`] : []),
        'Content:',
        document.text || '[No readable text found]',
      ].join('\n'))
      .join('\n\n---\n\n');

    return this.truncateText(context, maxPromptContextChars);
  }

  /**
   * Cắt ngắn văn bản theo giới hạn ký tự để tránh prompt hoặc document quá dài.
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}\n[Content truncated]`;
  }
}

export const documentFileService = new DocumentFileService();
