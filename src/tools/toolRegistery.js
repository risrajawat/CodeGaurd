const fileScannerTool = require("./fileScannerTool");
const fileReaderTool = require("./fileReaderTool");
const fileWriterTool = require("./fileWriterTool");

// Functions that can be executed locally
const toolImplementations = {
    list_files: fileScannerTool.listFiles,
    read_file: fileReaderTool.readFile,
    write_file: fileWriterTool.writeFile,
};

// Tool definitions sent to Gemini
const toolDeclarations = [
    fileScannerTool.declaration,
    fileReaderTool.declaration,
    fileWriterTool.declaration,
];

module.exports = {toolImplementations, toolDeclarations};