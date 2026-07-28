const vscode = require("vscode");

const {getGeminiApiKey, openExtensionSettings} = require("../config/settings");
const {runReviewAgent} = require("../agents/reviewAgent");
const {createOutputChannel} = require("../ui/outputChannel");

function registerReviewProjectCommand(){
    return vscode.commands.registerCommand(
        "codeguard.reviewProject",
        async(uri) => {
            const projectPath = getProjectPath(uri);

            if (!projectPath) {
                vscode.window.showErrorMessage("No project folder found.");
                return;
            }

            const apiKey = getGeminiApiKey();

            if(!apiKey){
                const choice = await vscode.window.showErrorMessage(
                    "Gemini api key is not set",
                    "Open Settings",
                );

                if(choice === "Open Settings"){
                    openExtensionSettings();
                }

                return;
            }

            const output = createOutputChannel();
            output.show();

            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: "CodeGuard is reviewing your project...",
                    cancellable: false,
                },
                async(progress) => {
                    const result = await runReviewAgent(projectPath, {
                        onFileStart(file){
                            progress.report({
                                message: `Reviewing ${file}`,
                            });

                            output.appendLine(`Reviewing: ${file}`);
                        },  

                        onFileFixed(file){
                            output.appendLine(`Fixed: ${file}`);
                        },
                    });

                    vscode.window.showInformationMessage(result.summaryText);
                }
            );
        }
    );
}

function getProjectPath(uri){
    if(uri){
        return uri.fspath;
    }

    const folders = vscode.workspace.workspaceFolders;

    if(!folders || folders.length === 0){
        return null;
    }

    return folders[0].uri.fsPath;
}

module.exports = {registerReviewProjectCommand};