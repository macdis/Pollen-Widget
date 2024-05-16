// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: gray; icon-glyph: trash-alt;
/*
**********************************************************************************
For use with the Pollen Widget script. See https://github.com/macdis/Pollen-Widget
**********************************************************************************
Licensed under the terms of the MIT License.
**********************************************************************************
*/
const fm = FileManager.local();
const dir = "macdis-pollen-widget-data";
const path = fm.joinPath(fm.documentsDirectory(), dir);
if (fm.isDirectory(path)) {
  const a = new Alert();
  a.title = "Warning!";
  a.message = "Erase all stored pollen data?";
  a.addAction("OK");
  a.addCancelAction("Cancel");
  const decision = await a.presentAlert();
  if (decision === -1) {
    return;
  } else {
    fm.remove(path);
  }
} else {
  console.error("Path does not exist!");
}
