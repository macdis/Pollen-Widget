// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: spa;
"use strict";
/*
****************************************************************
Pollen Widget
****************************************************************
This is a widget for use with the Scriptable app under iOS.
****************************************************************
See https://github.com/macdis/Pollen-Widget
****************************************************************
You must have a Google API key for this widget to work.
Google APIs required: Pollen API, Geocoding API.
See the README.md file for more information.
****************************************************************
Copyright (c) 2024 Iain Macdonald. Licensed under the terms of the MIT License.
****************************************************************
Please note:
Your Google API key can either be defined in this file (let apiKey = "...") or it
can be stored in a 'Pollen Widget.json' file saved in the same directory as the widget script.
If both are defined, then the value in 'Pollen Widget.json' is preferred.
Example of 'Pollen Widget.json':
{
  "apiKey": "yourGoogleApiKey"
}
*/
let apiKey = "yourGoogleApiKey"; // Google API key
const startMonth = 4; // 1=January ... 12=December
const endMonth = 9;
const offSeasonMessage = "Check back next"; // Of the form: `Check back next ${startMonth}!`
const days = 5;
const updateInterval = 4; // Hours
const useFlags = true;
const saved = { lat: 45.50192912538183, lon: -73.57192767537103 };
const savedSFSymbol = "house.fill";
const hereSFSymbol = "location.fill";
const colWidths = [18, 18, 18, 18, 18, 18];
const showUPI = false;
const myLocale = Device.locale().replace(/_/g, "-"); // Or use something like "en-CA" to override iOS settings
const languageCode = Device.language(); // Or use something like "en" to override iOS settings

// Fonts used
let placeFont = new Font("AvenirNext-Medium", 14);
const tableFont = new Font("AvenirNext-Medium", 11);
const footerFont = new Font("AvenirNext-Medium", 9);
const offSeasonFont = new Font("Chalkduster", 18);

// Some styling
const widgetColors = {
  bg0: "#194d2f", // For the widget background gradient
  bg1: "#1c1c1c", // Ditto
  defaultText: "#f5f5f5", // CSS whitesmoke
  lighterGrey: "#dcdcdc", // CSS Gainsboro
  0: "#003300", // This is used to give a colour value to zero UPI values. (Null values are transparent.)
  1: "#2d8953", // official = #009E3A The commented-out colours are the official Universal Pollen Index colours
  2: "#2ecc71", // official = #84CF59 (by "official" I mean the colours the Google Pollen API uses)
  3: "#f1c40f", // official = #FFFF00
  4: "#e67e22", // official = #FF8C00
  5: "#c0392b", // official = #FF0000
  colorDefault: "#000000",
};

// Corrections (in case you want a place name to be spelled in a certain way and the Google API doesn't spell it that way)
// { termToBeCorrected: "correctedVersion"}
let corrections = {
  Montreal: "Montréal",
};

////////////////////////////////////////////////////////////////
// OK so nothing *really* has to be changed below this point  //
////////////////////////////////////////////////////////////////

// Basics
const timeFrame = updateInterval * 3600; // Convert hours to seconds
const bgColorGradient = new LinearGradient();
bgColorGradient.colors = [
  new Color(widgetColors.bg0),
  new Color(widgetColors.bg1),
];
bgColorGradient.locations = [0, 0.75];
const now = new Date();
const nowLocal = +(+now).toString().slice(0, -3); // Epoch in seconds (strip milliseconds)

// Initialize local file manager and cache
const fm = FileManager.local();
const path = fm.joinPath(fm.documentsDirectory(), "macdis-pollen-widget-data");
if (!fm.fileExists(path)) fm.createDirectory(path, false);

// Remove all cached data outside of timeFrame + 86400 seconds (24 hours)
if (fm.isDirectory(path) && fm.listContents(path).length > 0) {
  fm.listContents(path).forEach((file) => {
    const thisFileTimeStamp = +(+fm.modificationDate(fm.joinPath(path, file)))
      .toString()
      .slice(0, -3); //Epoch in seconds (strip milliseconds)
    if (nowLocal - thisFileTimeStamp > timeFrame + 86400) {
      fm.remove(fm.joinPath(path, file));
    }
  });
}

//Initialize iCloud file manager
const fmCloud = FileManager.iCloud();
if (fmCloud.isDirectory(fmCloud.documentsDirectory())) {
  const jsonVar = fmCloud.joinPath(
    fmCloud.documentsDirectory(),
    "Pollen Widget.json"
  );
  if (fmCloud.fileExists(jsonVar)) {
    const imported = await JSON.parse(fmCloud.readString(jsonVar));
    if (imported.hasOwnProperty("apiKey") && imported.apiKey !== null) {
      apiKey = imported.apiKey;
    }
  }
} else console.log("The iCloud documents directory is not accessible.");

// Put the "on-season" months into an array
const months = [];
if (endMonth >= startMonth) {
  for (let i = startMonth; i <= endMonth; i++) {
    months.push(i);
  }
} else if (endMonth < startMonth) {
  // This is for cases like start=September and end=February (Australia)
  for (let i = startMonth; i <= 12; i++) {
    months.push(i);
  }
  for (let i = 1; i <= endMonth; i++) {
    months.push(i);
  }
}

// Run only from startMonth to endMonth
const month = now.getMonth() + 1;
if (!months.includes(month)) {
  // If outside of date range, do all this:
  const offSeasonWidget = new ListWidget();
  offSeasonWidget.backgroundGradient = bgColorGradient;
  offSeasonWidget.setPadding(6, 6, 6, 6);
  const stack = offSeasonWidget.addStack();
  stack.layoutHorizontally();
  stack.addSpacer();
  const message = stack.addText(
    `${offSeasonMessage} ${new Date(new Date().setMonth(startMonth - 1)).toLocaleString(myLocale, { month: "long" })}!`
  );
  message.centerAlignText();
  message.font = offSeasonFont;
  message.textColor = new Color(widgetColors.lighterGrey);
  message.shadowColor = Color.black();
  message.shadowOffset = new Point(1, 1);
  message.shadowRadius = 1;
  stack.addSpacer();
  // Lock screen widget
  const offSeasonWidgetLS = new ListWidget();
  offSeasonWidgetLS.backgroundGradient = bgColorGradient;
  offSeasonWidgetLS.setPadding(6, 6, 6, 6);
  const stackLS = offSeasonWidgetLS.addStack();
  stackLS.layoutHorizontally();
  stackLS.addSpacer();
  const messageLS = stackLS.addText("--");
  messageLS.centerAlignText();
  messageLS.font = Font.regularSystemFont(26);
  messageLS.textColor = new Color(widgetColors.lighterGrey);
  messageLS.shadowColor = Color.black();
  messageLS.shadowOffset = new Point(1, 1);
  messageLS.shadowRadius = 1;
  stackLS.addSpacer();
  // Delete the cache if we're done for the year
  if (fm.isDirectory(path)) fm.remove(path);
  // Set/show
  if (config.runsInAccessoryWidget) {
    Script.setWidget(offSeasonWidgetLS);
  } else if (config.runsInWidget) {
    Script.setWidget(offSeasonWidget);
  } else {
    offSeasonWidget.presentSmall();
    // offSeasonWidgetLS.presentAccessoryCircular();
  }
  Script.complete();
  return; // Exits the script
}

// Get the parameter from the home screen widget options
// or set it to 'here' (geolocation) if there isn't one.
if (
  !args.widgetParameter ||
  args.widgetParameter.toLowerCase().trim() === "here"
) {
  var searchTerm = "here";
  var sf = SFSymbol.named(hereSFSymbol);
  sf.applyLightWeight();
} else if (args.widgetParameter.toLowerCase().trim() === "saved") {
  var searchTerm = "saved";
  var sf = SFSymbol.named(savedSFSymbol);
  sf.applyLightWeight();
} else if (args.widgetParameter.toLowerCase().trim() === "clearcache") {
  if (fm.isDirectory(path) && fm.listContents(path).length > 0) {
    fm.remove(path);
    throw "[This is not an error] Cache cleared! Modify the widget parameter!";
  } else {
    throw "Cache already cleared! Modify the widget parameter!";
  }
} else {
  var searchTerm = args.widgetParameter
    .toLowerCase()
    .replace(/[\s\p{P}]+/gu, " ")
    .trim();
}

// Add the active file name to the path
const activeFile = fm.joinPath(
  path,
  `/pollen-${searchTerm.replace(/\s/g, "-")}.json`
);

// Fetch data only if there is no cached data
if (!fm.fileExists(activeFile)) {
  console.log("No cached data. Fetching.");
  var data = await getJsonData();
}
const cachedData = await JSON.parse(fm.readString(activeFile));

// Initialize date formatter
const df = new DateFormatter();
df.dateFormat = "yyyyMMdd";
// Get the dates we need as numbers
const nowLocalDate = +df.string(now); //yyyyMMdd
const nowUTCDate =
  +`${now.getUTCFullYear().toString()}${(now.getUTCMonth() + 1).toString().padStart(2, "0")}${now.getUTCDate().toString().padStart(2, "0")}`; //yyyyMMdd
const fileTimeStamp = +(+fm.modificationDate(activeFile))
  .toString()
  .slice(0, -3); //Epoch in seconds (strip milliseconds)
const inFileDate =
  +`${cachedData.dailyInfo[0].date.year}${cachedData.dailyInfo[0].date.month.toString().padStart(2, "0")}${cachedData.dailyInfo[0].date.day.toString().padStart(2, "0")}`; //yyyyMMdd
const dateDiff = nowLocalDate - nowUTCDate;

// Some debugging info, if needed
// console.log(`nowLocalDate = ${nowLocalDate}`);
// console.log(`nowUTCDate = ${nowUTCDate}`);
// console.log(`nowLocal = ${nowLocal}`);
// console.log(`inFileDate = ${inFileDate}`);
// console.log(`fileTimeStamp = ${fileTimeStamp}`);
// console.log(`Date difference = ${dateDiff}`);
console.log(`Data age = ${nowLocal - fileTimeStamp}/${timeFrame} seconds`);

// Is the local date the same as the UTC date?
// dateDiff = nowLocalDate - nowUTCDate;
//          = 20240614 - 20240614 = 0 means today and the data's today match, so just update normally
//          = 20240613 - 20240614 = -1 means you're in an UTC- timezone when it's midnight (or later) UTC, so keep the cached data until the dates match again
//          = 20240615 - 20240614 = +1 means you're in a UTC+ timezone when midnight arrives, so shift the data while waiting for the dates to match again
//          = something other than 0, -1, or 1 means Something's off, so reset

switch (dateDiff) {
  case 0:
    if (nowLocal - fileTimeStamp > timeFrame) {
      console.log("Cached data expired, fetching new data. [0]");
      var data = await getJsonData();
    } else {
      console.log("Using cached data. [0]");
      var data = cachedData;
    }
    break;
  case -1:
    if (nowLocal - fileTimeStamp > timeFrame) {
      console.log(
        "Cached data expired, but you're in UTC-x and the UTC date has changed. Re-using cached data for now. [-1]"
      );
      var data = cachedData;
    } else {
      console.log("Using cached data. [-1]");
      var data = cachedData;
    }
    break;
  case 1:
    if (nowLocal - fileTimeStamp > timeFrame) {
      console.log(
        "Cached data expired and you're in UTC+x and the UTC date is behind your date. Retrieving and shifting the data. [+1]"
      );
      var data = await getJsonData();
      data.dailyInfo.shift();
    } else {
      console.log("Using shifted cached data. [+1]");
      var data = cachedData;
      data.dailyInfo.shift();
    }
    break;
  default:
    console.log(
      "Your timezone may have changed drastically or something else is way off. Renewing the cached data."
    );
    var data = await getJsonData();
}

// Set some variables
const dayZero = new Date(
  data.dailyInfo[0].date.year,
  data.dailyInfo[0].date.month - 1,
  data.dailyInfo[0].date.day,
  0,
  0,
  0,
  0
);
const countryCode = data.regionCode;
let place = data.placeName;
if (corrections.hasOwnProperty(place)) place = corrections[place];

// Declare headers and rows arrays
const headers = [""]; // Use "" as cell 0,0 placeholder
const rows = [];

// Populate headers array, e.g., [ "M", "T", "W", "T", "F" ]
data.dailyInfo.forEach((forecastDay) => {
  const dayNarrow = new Date(
    forecastDay.date.year,
    forecastDay.date.month - 1,
    forecastDay.date.day,
    0,
    0,
    0,
    0
  ).toLocaleDateString(myLocale, {
    weekday: "narrow",
  });
  headers.push(dayNarrow);
});

// Populate data rows inside an array of rows, i.e., [ [pollenType G], [pollenType T], [pollenType W], ]
data.dailyInfo[0].pollenTypeInfo.forEach((pollenType, i) => {
  const singleRow = [];
  singleRow.push(pollenType.displayName);
  // Iterate over days, targetting the info for the pollen type we're currently looking at
  data.dailyInfo.forEach((forecastDay) => {
    if (forecastDay.pollenTypeInfo[i].hasOwnProperty("indexInfo")) {
      singleRow.push(forecastDay.pollenTypeInfo[i].indexInfo.value.toString());
    } else {
      // Use - to represent null values
      singleRow.push("-");
    }
  });
  rows.push(singleRow);
});

///////////////////////////////////////////////
// Initialize and configure the regular widget
const w = new ListWidget();
w.setPadding(0, 0, 0, 0);

// Add a background color, gradient, or image
w.backgroundGradient = bgColorGradient;

// Container stack
const stackContainer = w.addStack();
stackContainer.layoutVertically();
stackContainer.centerAlignContent();
// Place
const stackPlace = stackContainer.addStack();
stackPlace.layoutHorizontally();
stackPlace.addSpacer();
stackPlace.centerAlignContent();
stackPlace.backgroundColor = Color.clear();
if (searchTerm === "here" || searchTerm === "saved") {
  let stackPlaceImage = stackPlace.addImage(sf.image);
  stackPlaceImage.imageSize = new Size(colWidths[0] - 2, colWidths[0] - 2);
  stackPlaceImage.tintColor = new Color(widgetColors.defaultText);
  stackPlaceImage.centerAlignImage();
  if (place.length > 10) {
    place = place.substring(0, 10) + "\u2026";
  }
  var placeText = stackPlace.addText("\u00a0" + place);
  placeText.font = placeFont;
} else if (place.length > 12) {
  var placeText = stackPlace.addText(place.substring(0, 12) + "\u2026");
} else {
  var placeText = stackPlace.addText(place);
}
placeText.centerAlignText();
placeText.font = placeFont;
placeText.textColor = new Color(widgetColors.defaultText);
placeText.shadowColor = Color.black();
placeText.shadowOffset = new Point(1, 1);
placeText.shadowRadius = 1;
stackPlace.addSpacer();

// Push the previous stack up a bit
const stackPushPreviousUp = stackContainer.addStack();
stackPushPreviousUp.layoutVertically();
stackPushPreviousUp.addSpacer(2);

//////////////////
// Start of table
const headerColor = Color.clear();
const rowColor = Color.clear();
const backgroundColor = Color.clear();

// Add the headers
const headerStack = stackContainer.addStack();
headerStack.layoutHorizontally();
headerStack.addSpacer(); // Horizontal centering (left side)
headers.forEach((forecastDay, i) => {
  const headerText = forecastDay;
  const headerCell = headerStack.addStack();
  headerCell.layoutHorizontally();
  headerCell.centerAlignContent();
  headerCell.backgroundColor = headerColor;
  headerCell.size = new Size(colWidths[i], colWidths[i]);
  if (i === 0) {
    // If we're dealing with the cell 0,0 placeholder
    var textElement = headerCell.addText(""); // You can put some decorative element here, if you like.
    textElement.font = new Font("BodoniOrnamentsITCTT", 11);
  } else {
    // If we're dealing with any other cell
    var textElement = headerCell.addText(headerText);
    textElement.font = tableFont;
  }
  textElement.textColor = new Color(widgetColors.defaultText);
  textElement.shadowColor = Color.black();
  textElement.shadowOffset = new Point(1, 1);
  textElement.shadowRadius = 1;
  if (i !== headers.length - 1) headerStack.addSpacer(1); // Space between cells, except final cell in header row
});
headerStack.addSpacer(); // Horizontal centering (right side)
stackContainer.addSpacer(1); // Space between headers and data rows

// Now add the data rows
// But first limit the number of rows based on widget size
const theseRows = rows.slice(0, 4); // In our small widget case we only need 3 data rows anyway

theseRows.forEach((singleRow, i) => {
  const rowStack = stackContainer.addStack();
  rowStack.layoutHorizontally();
  rowStack.addSpacer(); // Horizontal centering (left side)
  singleRow.forEach((cell, j) => {
    if (j === 0) {
      var cellText = cell.charAt(0) + "\u00a0"; // Only take the first letter of the pollen type, e.g., G=Grass, T=Tree, W=Weed
    } else {
      var cellText = cell;
    }
    const dataCell = rowStack.addStack();
    dataCell.layoutHorizontally();
    dataCell.centerAlignContent();
    dataCell.size = new Size(colWidths[j], colWidths[j]); // Set second value (height) to zero for auto
    const textElement = dataCell.addText(cellText);
    textElement.font = tableFont;
    if (isNaN(cellText) && j === 0) {
      // If we're dealing with the first column (G, T, W)
      dataCell.backgroundColor = Color.clear();
      textElement.textColor = new Color(widgetColors.defaultText);
      textElement.shadowColor = Color.black();
      textElement.shadowOffset = new Point(1, 1);
      textElement.shadowRadius = 1;
    } else if (isNaN(cellText) && j !== 0) {
      // If we're dealing with a null value, represented by 'x' in the rows arrays
      dataCell.backgroundColor = Color.clear();
      textElement.textColor = Color.clear();
    } else {
      // If we're dealing with a UPI value of 0-5, N.B. 0 is represented as a near-black by default
      const pollenLevelColor = new Color(widgetColors[Number(cellText)]);
      dataCell.backgroundColor = pollenLevelColor;
      if (showUPI) {
        textElement.font = Font.mediumSystemFont(10);
        textElement.textColor = new Color(widgetColors.defaultText);
        textElement.shadowColor = Color.black();
        textElement.shadowOffset = new Point(1, 1);
        textElement.shadowRadius = 1;
      } else {
        textElement.textColor = pollenLevelColor;
      }
    }
    if (j !== singleRow.length - 1) rowStack.addSpacer(1); // Space between cells, except final cell in row
  });
  rowStack.addSpacer(); // Horizontal centering (right side)
  stackContainer.addSpacer(1); // Space between rows
});
// End of Table
////////////////

// Push next stack down a bit
const stackPushNextDown = stackContainer.addStack();
stackPushNextDown.layoutVertically();
stackPushNextDown.addSpacer(6);

// Footer (stackFooter contains parts)
// Start footer stack
const stackFooter = stackContainer.addStack();
stackFooter.layoutHorizontally();
stackFooter.addSpacer();
// First footer stack (date)
const stackFooter1 = stackFooter.addStack(); // Note that this is added to stackFooter
stackFooter1.centerAlignContent();
stackFooter1.backgroundColor = Color.clear();
let footer1 =
  new Date(dayZero).toLocaleDateString(myLocale) + "\u00a0\u2e31\u00a0";
const footer1Text = stackFooter1.addText(footer1);
footer1Text.centerAlignText();
footer1Text.font = footerFont;
footer1Text.textColor = Color.lightGray();
footer1Text.shadowColor = Color.black();
footer1Text.shadowOffset = new Point(1, 1);
footer1Text.shadowRadius = 1;
// Second footer stack (flag or country code)
const stackFooter2 = stackFooter.addStack(); // Note that this is added to stackFooter
stackFooter2.centerAlignContent();
stackFooter2.backgroundColor = Color.clear();
const footer2 = useFlags ? getFlagEmoji(countryCode) : countryCode;
const footer2Text = stackFooter2.addText(footer2);
footer2Text.leftAlignText();
footer2Text.font = useFlags ? Font.systemFont(12) : footerFont;
footer2Text.textColor = Color.lightGray();
footer2Text.shadowColor = Color.black();
footer2Text.shadowOffset = new Point(1, 1);
footer2Text.shadowRadius = 1;
// End footer stack
stackFooter.addSpacer();

////////////////////////////////////////////
// Accessory Circle Lock Screen Widget
// Create data object for Accessory Circle
const dataLS = {};
data.dailyInfo[0].pollenTypeInfo.forEach((pollenType, i) => {
  if (pollenType.hasOwnProperty("indexInfo")) {
    dataLS[pollenType.displayName.charAt(0)] = pollenType.indexInfo.value;
  }
});
// Calculate percentage to display
// The default is to make the total of all non-null pollen counts a percentage of their highest possible value.
// So given { G: 2, T: 3 }, then the highest possible total would be UPI=5 for G and UPI=5 for T, or 10 in all.
// The resulting percentage would be (2+3)/10 = 50%
// But you could also use the highest single value:
//
// let numerator = Math.max(...Object.values(dataLS));
// if (isNaN(numerator) || !isFinite(numerator)) numerator = 0;
// const denominator = 5;
///////////////////////////////////////////////////////////////
// Or you could choose one pollen type, e.g.,:
//
// let numerator = dataLS.T;
// if (isNaN(numerator)) numerator = 0;
// const denominator = 5;
///////////////////////////////////////////////////////////////
// If you uncomment one of the above options, then comment out the next two const declarations
const numerator = Object.values(dataLS).reduce(
  (accumulator, currentValue) => accumulator + currentValue,
  0
);
const denominator = 5 * Object.keys(dataLS).length;
// Avoid dividing by zero
if (denominator === 0) {
  var ratio = 0;
} else {
  var ratio = numerator / denominator;
}
// Configure the widget
const wLS = new ListWidget();
const progressStack = await progressCircle(wLS, ratio);
let sfLS = SFSymbol.named("leaf.fill");
sfLS.applyFont(Font.regularSystemFont(26));
sfLS = progressStack.addImage(sfLS.image);
sfLS.imageSize = new Size(26, 26);
sfLS.tintColor = new Color("#fafafa");

// Set or show the main widget and/or the lock screen widget
if (config.runsInAccessoryWidget) {
  Script.setWidget(wLS);
} else if (config.runsInWidget) {
  Script.setWidget(w);
} else {
  w.presentSmall();
  // wLS.presentAccessoryCircular();
}
Script.complete();

/////////////
// Functions
//
function getFlagEmoji(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

async function getJsonData() {
  let lat, lon, placeNameLong;
  if (searchTerm === "here") {
    try {
      const hereLocation = await getLocation();
      lat = hereLocation.latitude;
      lon = hereLocation.longitude;
    } catch (e) {
      // On error use last location
      if (fm.fileExists(activeFile)) {
        let tmp = await JSON.parse(fm.readString(activeFile));
        lat = tmp.location.latitude;
        lon = tmp.location.longitude;
      } else {
        throw "Geolocation failed!";
      }
    }
    placeNameLong = await getLocalityReverse(lat, lon, myLocale);
  } else if (searchTerm === "saved") {
    lat = saved.lat;
    lon = saved.lon;
    placeNameLong = await getLocalityReverse(lat, lon, myLocale);
  } else {
    const request = new Request(
      `https://maps.googleapis.com/maps/api/geocode/json?address="${searchTerm}"&language=${languageCode}&key=${apiKey}`
    );
    const geoJson = await request.loadJSON();
    if (geoJson.status !== "OK") throw "Incorrect place name or keyword?";
    const geoData = geoJson.results[0];
    placeNameLong = geoData.address_components[0].long_name;
    lat = geoData.geometry.location.lat;
    lon = geoData.geometry.location.lng;
  }
  const request = new Request(
    `https://pollen.googleapis.com/v1/forecast:lookup?location.latitude=${lat}&location.longitude=${lon}&days=${days}&key=${apiKey}&languageCode=${languageCode}&plantsDescription=0`
  );
  const allData = await request.loadJSON();
  if (allData.hasOwnProperty("dailyInfo")) {
    allData.placeName = placeNameLong; // Add place name to JSON for convenience
    allData.location = { latitude: lat, longitude: lon };
    fm.writeString(activeFile, JSON.stringify(allData));
    return allData;
  } else {
    throw new Error("Problem with download or API key not valid!");
  }
}

async function getLocalityReverse(lat, lon, loc) {
  try {
    Location.setAccuracyToKilometer();
    const placeJson = await Location.reverseGeocode(lat, lon, loc);
    return placeJson[0].locality;
  } catch (e) {
    console.warn("Reverse geocoding failed!");
    return null;
  }
}

async function getLocation() {
  try {
    Location.setAccuracyToKilometer(); // Pollen API resolution = 1x1 kilometers
    return await Location.current();
  } catch (e) {
    console.error("Couldn't get location!");
  }
}

async function progressCircle(
  on,
  value = 50,
  colour = "hsl(0, 0%, 100%)",
  background = "hsl(0, 0%, 10%)",
  size = 56,
  barWidth = 5.5
) {
  if (value > 1) {
    value /= 100;
  }
  if (value < 0) {
    value = 0;
  }
  if (value > 1) {
    value = 1;
  }

  async function isUsingDarkAppearance() {
    return !Color.dynamic(Color.white(), Color.black()).red;
  }
  let isDark = await isUsingDarkAppearance();

  if (colour.split("-").length > 1) {
    if (isDark) {
      colour = colour.split("-")[1];
    } else {
      colour = colour.split("-")[0];
    }
  }

  if (background.split("-").length > 1) {
    if (isDark) {
      background = background.split("-")[1];
    } else {
      background = background.split("-")[0];
    }
  }

  let w = new WebView();
  await w.loadHTML('<canvas id="c"></canvas>');

  let base64 = await w.evaluateJavaScript(
    `
  let colour = "${colour}",
    background = "${background}",
    size = ${size}*3,
    lineWidth = ${barWidth}*3,
    percent = ${value * 100}
      
  let canvas = document.getElementById('c'),
    c = canvas.getContext('2d')
  canvas.width = size
  canvas.height = size
  let posX = canvas.width / 2,
    posY = canvas.height / 2,
    onePercent = 360 / 100,
    result = onePercent * percent
  c.lineCap = 'round'
  c.beginPath()
  c.arc( posX, posY, (size-lineWidth-1)/2, (Math.PI/180) * 270, (Math.PI/180) * (270 + 360) )
  c.strokeStyle = background
  c.lineWidth = lineWidth 
  c.stroke()
  c.beginPath()
  c.strokeStyle = colour
  c.lineWidth = lineWidth
  c.arc( posX, posY, (size-lineWidth-1)/2, (Math.PI/180) * 270, (Math.PI/180) * (270 + result) )
  c.stroke()
  completion(canvas.toDataURL().replace("data:image/png;base64,",""))`,
    true
  );
  const image = Image.fromData(Data.fromBase64String(base64));

  let stack = on.addStack();
  stack.size = new Size(size, size);
  stack.backgroundImage = image;
  stack.centerAlignContent();
  let padding = barWidth * 2;
  stack.setPadding(padding, padding, padding, padding);

  return stack;
}
