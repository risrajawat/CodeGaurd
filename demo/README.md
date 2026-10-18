# Demo project

`buggy-app/` contains deliberate bugs (off-by-one, typos, wrong math, missing null checks,
hardcoded secret, `eval`, React key / effect / XSS issues, missing alt text).

Before running CodeGuard: `cd demo/buggy-app && npm test` -> 5 of 6 tests fail.
Open the `demo/buggy-app` folder in VS Code (in the Extension Development Host) and run
**CodeGuard: Review Project**. After the run all tests should pass.
