const fs = require("fs");

function readFileSafe({filePath}){
    try {
        return fs.readFileSync(filePath, "utf8");
    } catch (error) {
        throw new Error(`Unable to read "${filePath}": ${error.message}`);
    }
}

function writeFileSafe({filePath, content}){
    try {
        if(typeof content !== "string"){
            throw new Error("Content must be a string.");
        }

        fs.writeFileSync(filePath, content, "utf8");
    } catch (error) {
        throw new Error(`Unable to write "${filePath}": ${error.message}`);  
    }
}

module.exports = {readFileSafe, writeFileSafe};