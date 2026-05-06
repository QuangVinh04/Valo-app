const express = require('express');
const app = express();
const port = 3000;

app.get('/search', (req, res) => {
    const {q, category} = req.query;
    res.send(`Searching for "${q}" in category "${category}"`);
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});