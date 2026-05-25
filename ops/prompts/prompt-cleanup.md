I would like to do one more project check and cleanup.
Go through each file in the project git and ask questions:
A. is it consistent with other files in the project?
   If not consistent, fix.
B. can it be simplified or removed?
   Note that some things are intentionally mentioned 2-3 times. 
   For example, something can be mentioned in @ops/journal/2026-05-14-phase-1-pre-spec.md (because of discussion), then in Gherkin file (test case), and then in spec (TDD requires same things said in tests and spec). 
   But, remove unintentional duplications.

To verify that you have done it for all files in git repo, create a YYYY-MM-DD-status.md (with current date) in ops/journal/ with a table having 4 columns: 
1. File: md link
2. Consistent: Yes/No [: explanation...]
3. Simplified: Yes/No [: explanation...]
4. Reason for existence: ...
Don't include files that are cache or packages (they should be in .gitignore anyway).