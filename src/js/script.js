//test logic
let wordsList = [];
let currentWordIndex = 0;
let currentInput = "";
let inputHistory = [];
let currentCorrected = "";
let correctedHistory = [];
let sameWordset = false;
let textHasTab = false;
let randomQuote = null;
let bailout = false;

//test timer
let testActive = false;
let time = 0;
let timer = null;

//funbox
let activeFunbox = "none";
let memoryFunboxTimer = null;
let memoryFunboxInterval = null;

//pace caret
let paceCaret = null;

//ui
let pageTransition = false;
let notSignedInLastResult = null;
let verifyUserWhenLoggedIn = null;

let selectedQuoteId = 1;

///

// let CustomText = "The quick brown fox jumps over the lazy dog".split(" ");
// let CustomText.isWordRandom = false;
// let CustomText.word = 1;

async function activateFunbox(funbox, mode) {
  if (testActive || TestUI.resultVisible) {
    Notifications.add(
      "You can only change the funbox before starting a test.",
      0
    );
    return false;
  }
  if (Misc.getCurrentLanguage().ligatures) {
    if (funbox == "choo_choo" || funbox == "earthquake") {
      Notifications.add(
        "Current language does not support this funbox mode",
        0
      );
      activateFunbox("none", null);
      return;
    }
  }
  $("#funBoxTheme").attr("href", ``);
  $("#words").removeClass("nospace");
  // if (funbox === "none") {
  activeFunbox = "none";
  memoryFunboxInterval = clearInterval(memoryFunboxInterval);
  memoryFunboxTimer = null;
  $("#wordsWrapper").removeClass("hidden");
  // }

  if (mode === null || mode === undefined) {
    let list = await Misc.getFunboxList();
    mode = list.filter((f) => f.name === funbox)[0].type;
  }

  ManualRestart.set();
  if (mode === "style") {
    if (funbox != undefined) {
      $("#funBoxTheme").attr("href", `funbox/${funbox}.css`);
      activeFunbox = funbox;
    }

    if (funbox === "simon_says") {
      setKeymapMode("next");
      settingsGroups.keymapMode.updateButton();
      restartTest();
    }

    if (
      funbox === "read_ahead" ||
      funbox === "read_ahead_easy" ||
      funbox === "read_ahead_hard"
    ) {
      setHighlightMode("letter", true);
      restartTest();
    }
  } else if (mode === "script") {
    if (funbox === "tts") {
      $("#funBoxTheme").attr("href", `funbox/simon_says.css`);
      ConfigSet.keymapMode("off");
      settingsGroups.keymapMode.updateButton();
      restartTest();
    } else if (funbox === "layoutfluid") {
      ConfigSet.keymapMode("on");
      setKeymapMode("next");
      settingsGroups.keymapMode.updateButton();
      ConfigSet.savedLayout(Config.layout);
      setLayout("qwerty");
      settingsGroups.layout.updateButton();
      setKeymapLayout("qwerty");
      settingsGroups.keymapLayout.updateButton();
      restartTest();
    } else if (funbox === "memory") {
      setMode("words");
      setShowAllLines(true, true);
      restartTest(false, true);
      if (Config.keymapMode === "next") {
        setKeymapMode("react");
      }
    } else if (funbox === "nospace") {
      $("#words").addClass("nospace");
      setHighlightMode("letter", true);
      restartTest(false, true);
    }
    activeFunbox = funbox;
  }

  if (funbox !== "layoutfluid" || mode !== "script") {
    if (Config.layout !== Config.savedLayout) {
      setLayout(Config.savedLayout);
      settingsGroups.layout.updateButton();
    }
  }
  TestUI.updateModesNotice(sameWordset, textHasTab, paceCaret, activeFunbox);
  return true;
}

function toggleScriptFunbox(...params) {
  if (activeFunbox === "tts") {
    var msg = new SpeechSynthesisUtterance();
    msg.text = params[0];
    msg.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(msg);
  }
}

function getuid() {
  console.error("Only share this uid with Miodec and nobody else!");
  console.log(firebase.auth().currentUser.uid);
  console.error("Only share this uid with Miodec and nobody else!");
}

async function initWords() {
  testActive = false;
  wordsList = [];
  currentWordIndex = 0;
  TestUI.setCurrentWordElementIndex(0);
  // accuracy = {
  //   correct: 0,
  //   incorrect: 0,
  // };
  inputHistory = [];
  // correctedHistory = [];
  // currentCorrected = "";
  currentInput = "";

  let language = await Misc.getLanguage(Config.language);
  if (language && language.name !== Config.language) {
    ConfigSet.language("english");
  }

  if (!language) {
    ConfigSet.language("english");
    language = await Misc.getLanguage(Config.language);
  }

  if (
    Config.mode == "time" ||
    Config.mode == "words" ||
    Config.mode == "custom"
  ) {
    let wordsBound = 100;
    if (Config.showAllLines) {
      if (Config.mode === "custom") {
        if (CustomText.isWordRandom) {
          wordsBound = CustomText.word;
        } else if (CustomText.isTimeRandom) {
          wordsBound = 100;
        } else {
          wordsBound = CustomText.text.length;
        }
      } else if (Config.mode != "time") {
        wordsBound = Config.words;
      }
    } else {
      if (Config.mode === "words" && Config.words < wordsBound) {
        wordsBound = Config.words;
      }
      if (
        Config.mode == "custom" &&
        CustomText.isWordRandom &&
        CustomText.word < wordsBound
      ) {
        wordsBound = CustomText.word;
      }
      if (
        Config.mode == "custom" &&
        CustomText.isTimeRandom &&
        CustomText.time < wordsBound
      ) {
        wordsBound = 100;
      }
      if (
        Config.mode == "custom" &&
        !CustomText.isWordRandom &&
        CustomText.text.length < wordsBound
      ) {
        wordsBound = CustomText.text.length;
      }
    }

    if (
      (Config.mode === "custom" &&
        CustomText.isWordRandom &&
        CustomText.word == 0) ||
      (Config.mode === "custom" &&
        CustomText.isTimeRandom &&
        CustomText.time == 0)
    ) {
      wordsBound = 100;
    }

    if (Config.mode === "words" && Config.words === 0) {
      wordsBound = 100;
    }
    if (activeFunbox === "plus_one") {
      wordsBound = 2;
    }
    let wordset = language.words;
    if (Config.mode == "custom") {
      wordset = CustomText.text;
    }
    for (let i = 0; i < wordsBound; i++) {
      let randomWord = wordset[Math.floor(Math.random() * wordset.length)];
      const previousWord = wordsList[i - 1];
      const previousWord2 = wordsList[i - 2];
      if (
        Config.mode == "custom" &&
        (CustomText.isWordRandom || CustomText.isTimeRandom)
      ) {
        randomWord = wordset[Math.floor(Math.random() * wordset.length)];
      } else if (Config.mode == "custom" && !CustomText.isWordRandom) {
        randomWord = CustomText.text[i];
      } else {
        while (
          randomWord == previousWord ||
          randomWord == previousWord2 ||
          (!Config.punctuation && randomWord == "I") ||
          randomWord.indexOf(" ") > -1
        ) {
          randomWord = wordset[Math.floor(Math.random() * wordset.length)];
        }
      }

      if (activeFunbox === "rAnDoMcAsE") {
        let randomcaseword = "";
        for (let i = 0; i < randomWord.length; i++) {
          if (i % 2 != 0) {
            randomcaseword += randomWord[i].toUpperCase();
          } else {
            randomcaseword += randomWord[i];
          }
        }
        randomWord = randomcaseword;
      } else if (activeFunbox === "gibberish") {
        randomWord = Misc.getGibberish();
      } else if (activeFunbox === "58008") {
        setToggleSettings(false, true);
        randomWord = Misc.getNumbers(7);
      } else if (activeFunbox === "specials") {
        setToggleSettings(false, true);
        randomWord = Misc.getSpecials();
      } else if (activeFunbox === "ascii") {
        setToggleSettings(false, true);
        randomWord = Misc.getASCII();
      }

      if (Config.punctuation) {
        randomWord = punctuateWord(previousWord, randomWord, i, wordsBound);
      }
      if (Config.numbers) {
        if (Math.random() < 0.1) {
          randomWord = Misc.getNumbers(4);
        }
      }

      if (/\t/g.test(randomWord)) {
        textHasTab = true;
      }

      wordsList.push(randomWord);
    }
  } else if (Config.mode == "quote") {
    // setLanguage(Config.language.replace(/_\d*k$/g, ""), true);

    let quotes = await Misc.getQuotes(Config.language.replace(/_\d*k$/g, ""));

    if (quotes.length === 0) {
      Notifications.add(
        `No ${Config.language.replace(/_\d*k$/g, "")} quotes found`,
        0
      );
      TestUI.setTestRestarting(false);
      setMode("words");
      restartTest();
      return;
    }

    let rq;
    if (Config.quoteLength != -2) {
      let quoteLengths = Config.quoteLength;
      let groupIndex;
      if (quoteLengths.length > 1) {
        groupIndex =
          quoteLengths[Math.floor(Math.random() * quoteLengths.length)];
        while (quotes.groups[groupIndex].length === 0) {
          groupIndex =
            quoteLengths[Math.floor(Math.random() * quoteLengths.length)];
        }
      } else {
        groupIndex = quoteLengths[0];
        if (quotes.groups[groupIndex].length === 0) {
          Notifications.add("No quotes found for selected quote length", 0);
          TestUI.setTestRestarting(false);
          return;
        }
      }

      rq =
        quotes.groups[groupIndex][
          Math.floor(Math.random() * quotes.groups[groupIndex].length)
        ];
      if (randomQuote != null && rq.id === randomQuote.id) {
        rq =
          quotes.groups[groupIndex][
            Math.floor(Math.random() * quotes.groups[groupIndex].length)
          ];
      }
    } else {
      quotes.groups.forEach((group) => {
        let filtered = group.filter((quote) => quote.id == selectedQuoteId);
        if (filtered.length > 0) {
          rq = filtered[0];
        }
      });
      if (rq == undefined) {
        rq = quotes.groups[0][0];
        Notifications.add("Quote Id Does Not Exist", 0);
      }
    }
    randomQuote = rq;
    randomQuote.text = randomQuote.text.replace(/ +/gm, " ");
    randomQuote.text = randomQuote.text.replace(/\\\\t/gm, "\t");
    randomQuote.text = randomQuote.text.replace(/\\\\n/gm, "\n");
    randomQuote.text = randomQuote.text.replace(/\\t/gm, "\t");
    randomQuote.text = randomQuote.text.replace(/\\n/gm, "\n");
    randomQuote.text = randomQuote.text.replace(/( *(\r\n|\r|\n) *)/g, "\n ");
    let w = randomQuote.text.trim().split(" ");
    for (let i = 0; i < w.length; i++) {
      if (/\t/g.test(w[i])) {
        textHasTab = true;
      }
      wordsList.push(w[i]);
    }
  }
  //handle right-to-left languages
  if (language.leftToRight) {
    TestUI.arrangeCharactersLeftToRight();
  } else {
    TestUI.arrangeCharactersRightToLeft();
  }
  if (language.ligatures) {
    $("#words").addClass("withLigatures");
  } else {
    $("#words").removeClass("withLigatures");
  }
  // if (Config.mode == "zen") {
  //   // Creating an empty active word element for zen mode
  //   $("#words").append('<div class="word active"></div>');
  //   $("#words").css("height", "auto");
  //   $("#wordsWrapper").css("height", "auto");
  // } else {
  showWords();
  // }
}

function setToggleSettings(state, nosave) {
  setPunctuation(state, nosave);
  setNumbers(state, nosave);
}

function emulateLayout(event) {
  function emulatedLayoutShouldShiftKey(event, newKeyPreview) {
    if (Config.capsLockBackspace) return event.shiftKey;
    const isCapsLockHeld = event.originalEvent.getModifierState("CapsLock");
    if (isCapsLockHeld)
      return Misc.isASCIILetter(newKeyPreview) !== event.shiftKey;
    return event.shiftKey;
  }

  function replaceEventKey(event, keyCode) {
    const newKey = String.fromCharCode(keyCode);
    event.keyCode = keyCode;
    event.charCode = keyCode;
    event.which = keyCode;
    event.key = newKey;
    event.code = "Key" + newKey.toUpperCase();
  }

  let newEvent = event;

  try {
    if (Config.layout === "default") {
      //override the caps lock modifier for the default layout if needed
      if (Config.capsLockBackspace && Misc.isASCIILetter(newEvent.key)) {
        replaceEventKey(
          newEvent,
          newEvent.shiftKey
            ? newEvent.key.toUpperCase().charCodeAt(0)
            : newEvent.key.toLowerCase().charCodeAt(0)
        );
      }
      return newEvent;
    }
    const keyEventCodes = [
      "Backquote",
      "Digit1",
      "Digit2",
      "Digit3",
      "Digit4",
      "Digit5",
      "Digit6",
      "Digit7",
      "Digit8",
      "Digit9",
      "Digit0",
      "Minus",
      "Equal",
      "KeyQ",
      "KeyW",
      "KeyE",
      "KeyR",
      "KeyT",
      "KeyY",
      "KeyU",
      "KeyI",
      "KeyO",
      "KeyP",
      "BracketLeft",
      "BracketRight",
      "Backslash",
      "KeyA",
      "KeyS",
      "KeyD",
      "KeyF",
      "KeyG",
      "KeyH",
      "KeyJ",
      "KeyK",
      "KeyL",
      "Semicolon",
      "Quote",
      "IntlBackslash",
      "KeyZ",
      "KeyX",
      "KeyC",
      "KeyV",
      "KeyB",
      "KeyN",
      "KeyM",
      "Comma",
      "Period",
      "Slash",
      "Space",
    ];
    const layoutMap = layouts[Config.layout].keys;

    let mapIndex;
    for (let i = 0; i < keyEventCodes.length; i++) {
      if (newEvent.code == keyEventCodes[i]) {
        mapIndex = i;
      }
    }
    const newKeyPreview = layoutMap[mapIndex][0];
    const shift = emulatedLayoutShouldShiftKey(newEvent, newKeyPreview) ? 1 : 0;
    const newKey = layoutMap[mapIndex][shift];
    replaceEventKey(newEvent, newKey.charCodeAt(0));
  } catch (e) {
    return event;
  }
  return newEvent;
}

function punctuateWord(previousWord, currentWord, index, maxindex) {
  let word = currentWord;

  if (
    (index == 0 ||
      Misc.getLastChar(previousWord) == "." ||
      Misc.getLastChar(previousWord) == "?" ||
      Misc.getLastChar(previousWord) == "!") &&
    Config.language.split("_")[0] != "code"
  ) {
    //always capitalise the first word or if there was a dot unless using a code alphabet
    word = Misc.capitalizeFirstLetter(word);
  } else if (
    (Math.random() < 0.1 &&
      Misc.getLastChar(previousWord) != "." &&
      Misc.getLastChar(previousWord) != "," &&
      index != maxindex - 2) ||
    index == maxindex - 1
  ) {
    let rand = Math.random();
    if (rand <= 0.8) {
      word += ".";
    } else if (rand > 0.8 && rand < 0.9) {
      if (Config.language.split("_")[0] == "french") {
        word = "?";
      } else {
        word += "?";
      }
    } else {
      if (Config.language.split("_")[0] == "french") {
        word = "!";
      } else {
        word += "!";
      }
    }
  } else if (
    Math.random() < 0.01 &&
    Misc.getLastChar(previousWord) != "," &&
    Misc.getLastChar(previousWord) != "." &&
    Config.language.split("_")[0] !== "russian"
  ) {
    word = `"${word}"`;
  } else if (
    Math.random() < 0.011 &&
    Misc.getLastChar(previousWord) != "," &&
    Misc.getLastChar(previousWord) != "." &&
    Config.language.split("_")[0] !== "russian"
  ) {
    word = `'${word}'`;
  } else if (
    Math.random() < 0.012 &&
    Misc.getLastChar(previousWord) != "," &&
    Misc.getLastChar(previousWord) != "."
  ) {
    if (Config.language.split("_")[0] == "code") {
      let r = Math.random();
      if (r < 0.25) {
        word = `(${word})`;
      } else if (r < 0.5) {
        word = `{${word}}`;
      } else if (r < 0.75) {
        word = `[${word}]`;
      } else {
        word = `<${word}>`;
      }
    } else {
      word = `(${word})`;
    }
  } else if (Math.random() < 0.013) {
    if (Config.language.split("_")[0] == "french") {
      word = ":";
    } else {
      word += ":";
    }
  } else if (
    Math.random() < 0.014 &&
    Misc.getLastChar(previousWord) != "," &&
    Misc.getLastChar(previousWord) != "." &&
    previousWord != "-"
  ) {
    word = "-";
  } else if (
    Math.random() < 0.015 &&
    Misc.getLastChar(previousWord) != "," &&
    Misc.getLastChar(previousWord) != "." &&
    Misc.getLastChar(previousWord) != ";"
  ) {
    if (Config.language.split("_")[0] == "french") {
      word = ";";
    } else {
      word += ";";
    }
  } else if (Math.random() < 0.2 && Misc.getLastChar(previousWord) != ",") {
    word += ",";
  } else if (Math.random() < 0.25 && Config.language.split("_")[0] == "code") {
    let specials = ["{", "}", "[", "]", "(", ")", ";", "=", "%", "/"];

    word = specials[Math.floor(Math.random() * 10)];
  }
  return word;
}

function addWord() {
  let bound = 100;
  if (activeFunbox === "plus_one") bound = 1;
  if (
    wordsList.length - inputHistory.length > bound ||
    (Config.mode === "words" &&
      wordsList.length >= Config.words &&
      Config.words > 0) ||
    (Config.mode === "custom" &&
      CustomText.isWordRandom &&
      wordsList.length >= CustomText.word &&
      CustomText.word != 0) ||
    (Config.mode === "custom" &&
      !CustomText.isWordRandom &&
      wordsList.length >= CustomText.text.length)
  )
    return;
  const language =
    Config.mode !== "custom"
      ? Misc.getCurrentLanguage()
      : {
          //borrow the direction of the current language
          leftToRight: Misc.getCurrentLanguage().leftToRight,
          words: CustomText.text,
        };
  const wordset = language.words;
  let randomWord = wordset[Math.floor(Math.random() * wordset.length)];
  const previousWord = wordsList[wordsList.length - 1];
  const previousWordStripped = previousWord
    .replace(/[.?!":\-,]/g, "")
    .toLowerCase();
  const previousWord2Stripped = wordsList[wordsList.length - 2]
    .replace(/[.?!":\-,]/g, "")
    .toLowerCase();

  if (
    Config.mode === "custom" &&
    CustomText.isWordRandom &&
    wordset.length < 3
  ) {
    randomWord = wordset[Math.floor(Math.random() * wordset.length)];
  } else if (Config.mode == "custom" && !CustomText.isWordRandom) {
    randomWord = CustomText.text[wordsList.length];
  } else {
    while (
      previousWordStripped == randomWord ||
      previousWord2Stripped == randomWord ||
      randomWord.indexOf(" ") > -1 ||
      (!Config.punctuation && randomWord == "I")
    ) {
      randomWord = wordset[Math.floor(Math.random() * wordset.length)];
    }
  }

  if (activeFunbox === "rAnDoMcAsE") {
    let randomcaseword = "";
    for (let i = 0; i < randomWord.length; i++) {
      if (i % 2 != 0) {
        randomcaseword += randomWord[i].toUpperCase();
      } else {
        randomcaseword += randomWord[i];
      }
    }
    randomWord = randomcaseword;
  } else if (activeFunbox === "gibberish") {
    randomWord = Misc.getGibberish();
  } else if (activeFunbox === "58008") {
    randomWord = Misc.getNumbers(7);
  } else if (activeFunbox === "specials") {
    randomWord = Misc.getSpecials();
  } else if (activeFunbox === "ascii") {
    randomWord = Misc.getASCII();
  }

  if (Config.punctuation && Config.mode != "custom") {
    randomWord = punctuateWord(previousWord, randomWord, wordsList.length, 0);
  }
  if (Config.numbers && Config.mode != "custom") {
    if (Math.random() < 0.1) {
      randomWord = Misc.getNumbers(4);
    }
  }

  wordsList.push(randomWord);

  let w = "<div class='word'>";
  for (let c = 0; c < randomWord.length; c++) {
    w += "<letter>" + randomWord.charAt(c) + "</letter>";
  }
  w += "</div>";
  $("#words").append(w);
}

function showWords() {
  $("#words").empty();

  let wordsHTML = "";
  let newlineafter = false;
  if (Config.mode !== "zen") {
    for (let i = 0; i < wordsList.length; i++) {
      newlineafter = false;
      wordsHTML += `<div class='word'>`;
      for (let c = 0; c < wordsList[i].length; c++) {
        if (wordsList[i].charAt(c) === "\t") {
          wordsHTML += `<letter class='tabChar'><i class="fas fa-long-arrow-alt-right"></i></letter>`;
        } else if (wordsList[i].charAt(c) === "\n") {
          newlineafter = true;
          wordsHTML += `<letter class='nlChar'><i class="fas fa-angle-down"></i></letter>`;
        } else {
          wordsHTML += "<letter>" + wordsList[i].charAt(c) + "</letter>";
        }
      }
      wordsHTML += "</div>";
      if (newlineafter) wordsHTML += "<div class='newline'></div>";
    }
  } else {
    wordsHTML =
      '<div class="word">word height</div><div class="word active"></div>';
  }

  $("#words").html(wordsHTML);

  $("#wordsWrapper").removeClass("hidden");
  const wordHeight = $(document.querySelector(".word")).outerHeight(true);
  const wordsHeight = $(document.querySelector("#words")).outerHeight(true);
  if (
    Config.showAllLines &&
    Config.mode != "time" &&
    !(CustomText.isWordRandom && CustomText.word == 0) &&
    !CustomText.isTimeRandom
  ) {
    $("#words").css("height", "auto");
    $("#wordsWrapper").css("height", "auto");
    let nh = wordHeight * 3;

    if (nh > wordsHeight) {
      nh = wordsHeight;
    }
    $(".outOfFocusWarning").css("line-height", nh + "px");
  } else {
    $("#words")
      .css("height", wordHeight * 4 + "px")
      .css("overflow", "hidden");
    $("#wordsWrapper")
      .css("height", wordHeight * 3 + "px")
      .css("overflow", "hidden");
    $(".outOfFocusWarning").css("line-height", wordHeight * 3 + "px");
  }

  if (Config.mode === "zen") {
    $(document.querySelector(".word")).remove();
  }

  if (Config.keymapMode === "next") {
    Keymap.highlightKey(
      wordsList[currentWordIndex]
        .substring(currentInput.length, currentInput.length + 1)
        .toString()
        .toUpperCase()
    );
  }

  TestUI.updateActiveElement();
  toggleScriptFunbox(wordsList[currentWordIndex]);

  Caret.updatePosition(currentInput);
}

(function (history) {
  var pushState = history.pushState;
  history.pushState = function (state) {
    if (activeFunbox === "memory" && state !== "/") {
      memoryFunboxInterval = clearInterval(memoryFunboxInterval);
      memoryFunboxTimer = null;
    }
    return pushState.apply(history, arguments);
  };
})(window.history);

function updateWordElement(showError) {
  // if (Config.mode == "zen") return;

  let input = currentInput;
  let wordAtIndex;
  let currentWord;
  wordAtIndex = document.querySelector("#words .word.active");
  currentWord = wordsList[currentWordIndex];
  let ret = "";

  let newlineafter = false;

  if (Config.mode === "zen") {
    for (let i = 0; i < currentInput.length; i++) {
      if (currentInput[i] === "\t") {
        ret += `<letter class='tabChar correct'><i class="fas fa-long-arrow-alt-right"></i></letter>`;
      } else if (currentInput[i] === "\n") {
        newlineafter = true;
        ret += `<letter class='nlChar correct'><i class="fas fa-angle-down"></i></letter>`;
      } else {
        ret += `<letter class="correct">` + currentInput[i] + `</letter>`;
      }
    }
  } else {
    if (Config.highlightMode == "word") {
      //only for word highlight

      let correctSoFar = false;
      if (currentWord.slice(0, input.length) == input) {
        // this is when input so far is correct
        correctSoFar = true;
      }
      let classString = correctSoFar ? "correct" : "incorrect";
      if (Config.blindMode) {
        classString = "correct";
      }

      //show letters in the current word
      for (let i = 0; i < currentWord.length; i++) {
        ret += `<letter class="${classString}">` + currentWord[i] + `</letter>`;
      }

      //show any extra letters if hide extra letters is disabled
      if (
        currentInput.length > currentWord.length &&
        !Config.hideExtraLetters
      ) {
        for (let i = currentWord.length; i < currentInput.length; i++) {
          let letter = currentInput[i];
          if (letter == " ") {
            letter = "_";
          }
          ret += `<letter class="${classString}">${letter}</letter>`;
        }
      }
    } else {
      for (let i = 0; i < input.length; i++) {
        let charCorrect;
        if (currentWord[i] == input[i]) {
          charCorrect = true;
        } else {
          charCorrect = false;
        }

        let currentLetter = currentWord[i];
        let tabChar = "";
        let nlChar = "";
        if (currentLetter === "\t") {
          tabChar = "tabChar";
          currentLetter = `<i class="fas fa-long-arrow-alt-right"></i>`;
        } else if (currentLetter === "\n") {
          nlChar = "nlChar";
          currentLetter = `<i class="fas fa-angle-down"></i>`;
        }

        if (charCorrect) {
          ret += `<letter class="correct ${tabChar}${nlChar}">${currentLetter}</letter>`;
        } else {
          // if (Config.difficulty == "master") {
          //   if (!TestUI.resultVisible) {
          //     failTest();
          //   }
          // }
          if (!showError) {
            if (currentLetter !== undefined) {
              ret += `<letter class="correct ${tabChar}${nlChar}">${currentLetter}</letter>`;
            }
          } else {
            if (currentLetter == undefined) {
              if (!Config.hideExtraLetters) {
                let letter = input[i];
                if (letter == " " || letter == "\t" || letter == "\n") {
                  letter = "_";
                }
                ret += `<letter class="incorrect extra ${tabChar}${nlChar}">${letter}</letter>`;
              }
            } else {
              ret +=
                `<letter class="incorrect ${tabChar}${nlChar}">` +
                currentLetter +
                (Config.indicateTypos ? `<hint>${input[i]}</hint>` : "") +
                "</letter>";
            }
          }
        }
      }

      if (input.length < currentWord.length) {
        for (let i = input.length; i < currentWord.length; i++) {
          if (currentWord[i] === "\t") {
            ret += `<letter class='tabChar'><i class="fas fa-long-arrow-alt-right"></i></letter>`;
          } else if (currentWord[i] === "\n") {
            ret += `<letter class='nlChar'><i class="fas fa-angle-down"></i></letter>`;
          } else {
            ret += "<letter>" + currentWord[i] + "</letter>";
          }
        }
      }
    }
  }
  wordAtIndex.innerHTML = ret;
  if (newlineafter) $("#words").append("<div class='newline'></div>");
}

function highlightBadWord(index, showError) {
  if (!showError) return;
  $($("#words .word")[index]).addClass("error");
}

function showTimer() {
  let op = Config.showTimerProgress ? Config.timerOpacity : 0;
  if (Config.mode != "zen" && Config.timerStyle === "bar") {
    $("#timerWrapper").stop(true, true).removeClass("hidden").animate(
      {
        opacity: op,
      },
      125
    );
  } else if (Config.timerStyle === "text") {
    $("#timerNumber")
      .stop(true, true)
      .removeClass("hidden")
      .css("opacity", 0)
      .animate(
        {
          opacity: op,
        },
        125
      );
  } else if (Config.mode == "zen" || Config.timerStyle === "mini") {
    if (op > 0) {
      $("#miniTimerAndLiveWpm .time")
        .stop(true, true)
        .removeClass("hidden")
        .animate(
          {
            opacity: op,
          },
          125
        );
    }
  }
}

function hideTimer() {
  $("#timerWrapper").stop(true, true).animate(
    {
      opacity: 0,
    },
    125
  );
  $("#miniTimerAndLiveWpm .time")
    .stop(true, true)
    .animate(
      {
        opacity: 0,
      },
      125,
      () => {
        $("#miniTimerAndLiveWpm .time").addClass("hidden");
      }
    );
  $("#timerNumber").stop(true, true).animate(
    {
      opacity: 0,
    },
    125
  );
}

function restartTimer() {
  if (Config.timerStyle === "bar") {
    if (Config.mode === "time") {
      $("#timer").stop(true, true).animate(
        {
          width: "100vw",
        },
        0
      );
    } else if (Config.mode === "words" || Config.mode === "custom") {
      $("#timer").stop(true, true).animate(
        {
          width: "0vw",
        },
        0
      );
    }
  }
}

function updateTimer() {
  if (!Config.showTimerProgress) return;
  if (
    Config.mode === "time" ||
    (Config.mode === "custom" && CustomText.isTimeRandom)
  ) {
    let maxtime = Config.time;
    if (Config.mode === "custom" && CustomText.isTimeRandom) {
      maxtime = CustomText.time;
    }
    if (Config.timerStyle === "bar") {
      let percent = 100 - ((time + 1) / maxtime) * 100;
      $("#timer")
        .stop(true, true)
        .animate(
          {
            width: percent + "vw",
          },
          1000,
          "linear"
        );
    } else if (Config.timerStyle === "text") {
      let displayTime = Misc.secondsToString(maxtime - time);
      if (maxtime === 0) {
        displayTime = Misc.secondsToString(time);
      }
      $("#timerNumber").html("<div>" + displayTime + "</div>");
    } else if (Config.timerStyle === "mini") {
      let displayTime = Misc.secondsToString(maxtime - time);
      if (maxtime === 0) {
        displayTime = Misc.secondsToString(time);
      }
      $("#miniTimerAndLiveWpm .time").html(displayTime);
    }
  } else if (
    Config.mode === "words" ||
    Config.mode === "custom" ||
    Config.mode === "quote"
  ) {
    if (Config.timerStyle === "bar") {
      let outof = wordsList.length;
      if (Config.mode === "words") {
        outof = Config.words;
      }
      if (Config.mode === "custom") {
        if (CustomText.isWordRandom) {
          outof = CustomText.word;
        } else {
          outof = CustomText.text.length;
        }
      }
      let percent = Math.floor(((currentWordIndex + 1) / outof) * 100);
      $("#timer")
        .stop(true, true)
        .animate(
          {
            width: percent + "vw",
          },
          250
        );
    } else if (Config.timerStyle === "text") {
      let outof = wordsList.length;
      if (Config.mode === "words") {
        outof = Config.words;
      }
      if (Config.mode === "custom") {
        if (CustomText.isWordRandom) {
          outof = CustomText.word;
        } else {
          outof = CustomText.text.length;
        }
      }
      if (outof === 0) {
        $("#timerNumber").html("<div>" + `${inputHistory.length}` + "</div>");
      } else {
        $("#timerNumber").html(
          "<div>" + `${inputHistory.length}/${outof}` + "</div>"
        );
      }
    } else if (Config.timerStyle === "mini") {
      let outof = wordsList.length;
      if (Config.mode === "words") {
        outof = Config.words;
      }
      if (Config.mode === "custom") {
        if (CustomText.isWordRandom) {
          outof = CustomText.word;
        } else {
          outof = CustomText.text.length;
        }
      }
      if (Config.words === 0) {
        $("#miniTimerAndLiveWpm .time").html(`${inputHistory.length}`);
      } else {
        $("#miniTimerAndLiveWpm .time").html(`${inputHistory.length}/${outof}`);
      }
    }
  } else if (Config.mode == "zen") {
    if (Config.timerStyle === "text") {
      $("#timerNumber").html("<div>" + `${inputHistory.length}` + "</div>");
    } else {
      $("#miniTimerAndLiveWpm .time").html(`${inputHistory.length}`);
    }
  }
}

function countChars() {
  let correctWordChars = 0;
  let correctChars = 0;
  let incorrectChars = 0;
  let extraChars = 0;
  let missedChars = 0;
  let spaces = 0;
  let correctspaces = 0;
  for (let i = 0; i < inputHistory.length; i++) {
    let word = Config.mode == "zen" ? inputHistory[i] : wordsList[i];
    if (inputHistory[i] === "") {
      //last word that was not started
      continue;
    }
    if (inputHistory[i] == word) {
      //the word is correct
      correctWordChars += word.length;
      correctChars += word.length;
      if (
        i < inputHistory.length - 1 &&
        Misc.getLastChar(inputHistory[i]) !== "\n"
      ) {
        correctspaces++;
      }
    } else if (inputHistory[i].length >= word.length) {
      //too many chars
      for (let c = 0; c < inputHistory[i].length; c++) {
        if (c < word.length) {
          //on char that still has a word list pair
          if (inputHistory[i][c] == word[c]) {
            correctChars++;
          } else {
            incorrectChars++;
          }
        } else {
          //on char that is extra
          extraChars++;
        }
      }
    } else {
      //not enough chars
      let toAdd = {
        correct: 0,
        incorrect: 0,
        missed: 0,
      };
      for (let c = 0; c < word.length; c++) {
        if (c < inputHistory[i].length) {
          //on char that still has a word list pair
          if (inputHistory[i][c] == word[c]) {
            toAdd.correct++;
          } else {
            toAdd.incorrect++;
          }
        } else {
          //on char that is extra
          toAdd.missed++;
        }
      }
      correctChars += toAdd.correct;
      incorrectChars += toAdd.incorrect;
      if (i === inputHistory.length - 1 && Config.mode == "time") {
        //last word - check if it was all correct - add to correct word chars
        if (toAdd.incorrect === 0) correctWordChars += toAdd.correct;
      } else {
        missedChars += toAdd.missed;
      }
    }
    if (i < inputHistory.length - 1) {
      spaces++;
    }
  }
  if (activeFunbox === "nospace") {
    spaces = 0;
    correctspaces = 0;
  }
  return {
    spaces: spaces,
    correctWordChars: correctWordChars,
    allCorrectChars: correctChars,
    incorrectChars:
      Config.mode == "zen" ? TestStats.accuracy.incorrect : incorrectChars,
    extraChars: extraChars,
    missedChars: missedChars,
    correctSpaces: correctspaces,
  };
}

function calculateStats() {
  let testSeconds = TestStats.calculateTestSeconds();
  let chars = countChars();
  let wpm = Misc.roundTo2(
    ((chars.correctWordChars + chars.correctSpaces) * (60 / testSeconds)) / 5
  );
  let wpmraw = Misc.roundTo2(
    ((chars.allCorrectChars +
      chars.spaces +
      chars.incorrectChars +
      chars.extraChars) *
      (60 / testSeconds)) /
      5
  );
  let acc = Misc.roundTo2(TestStats.calculateAccuracy());
  return {
    wpm: isNaN(wpm) ? 0 : wpm,
    wpmRaw: isNaN(wpmraw) ? 0 : wpmraw,
    acc: acc,
    correctChars: chars.correctWordChars,
    incorrectChars: chars.incorrectChars,
    missedChars: chars.missedChars,
    extraChars: chars.extraChars,
    allChars:
      chars.allCorrectChars +
      chars.spaces +
      chars.incorrectChars +
      chars.extraChars,
    time: testSeconds,
    spaces: chars.spaces,
    correctSpaces: chars.correctSpaces,
  };
}

function hideCrown() {
  $("#result .stats .wpm .crown").css("opacity", 0).addClass("hidden");
}

function showCrown() {
  $("#result .stats .wpm .crown")
    .removeClass("hidden")
    .css("opacity", "0")
    .animate(
      {
        opacity: 1,
      },
      250,
      "easeOutCubic"
    );
}

function failTest() {
  inputHistory.push(currentInput);
  correctedHistory.push(currentCorrected);
  TestStats.pushKeypressesToHistory();
  TestStats.setLastSecondNotRound();
  showResult(true);
  let testSeconds = TestStats.calculateTestSeconds(performance.now());
  let afkseconds = TestStats.calculateAfkSeconds();
  TestStats.incrementIncompleteSeconds(testSeconds - afkseconds);
  TestStats.incrementRestartCount();
}

function showResult(difficultyFailed = false) {
  if (!testActive) return;
  if (Config.mode == "zen" && currentInput.length != 0) {
    inputHistory.push(currentInput);
    correctedHistory.push(currentCorrected);
  }

  TestStats.recordKeypressSpacing();

  TestUI.setResultCalculating(true);
  TestUI.setResultVisible(true);
  TestStats.setEnd(performance.now());
  testActive = false;
  Focus.set(false);
  Caret.hide();
  LiveWpm.hide();
  hideCrown();
  LiveAcc.hide();
  hideTimer();
  Keymap.hide();
  let stats = calculateStats();
  if (stats === undefined) {
    stats = {
      wpm: 0,
      wpmRaw: 0,
      acc: 0,
      correctChars: 0,
      incorrectChars: 0,
      missedChars: 0,
      extraChars: 0,
      time: 0,
      spaces: 0,
      correctSpaces: 0,
    };
  }
  let inf = false;
  if (stats.wpm >= 1000) {
    inf = true;
  }
  clearTimeout(timer);
  let testtime = stats.time;
  let afkseconds = TestStats.calculateAfkSeconds();
  let afkSecondsPercent = Misc.roundTo2((afkseconds / testtime) * 100);

  ChartController.result.options.annotation.annotations = [];

  $("#result #resultWordsHistory").addClass("hidden");

  if (Config.alwaysShowDecimalPlaces) {
    if (Config.alwaysShowCPM == false) {
      $("#result .stats .wpm .top .text").text("wpm");
      if (inf) {
        $("#result .stats .wpm .bottom").text("Infinite");
      } else {
        $("#result .stats .wpm .bottom").text(Misc.roundTo2(stats.wpm));
      }
      $("#result .stats .raw .bottom").text(Misc.roundTo2(stats.wpmRaw));
      $("#result .stats .wpm .bottom").attr(
        "aria-label",
        Misc.roundTo2(stats.wpm * 5) + " cpm"
      );
    } else {
      $("#result .stats .wpm .top .text").text("cpm");
      if (inf) {
        $("#result .stats .wpm .bottom").text("Infinite");
      } else {
        $("#result .stats .wpm .bottom").text(Misc.roundTo2(stats.wpm * 5));
      }
      $("#result .stats .raw .bottom").text(Misc.roundTo2(stats.wpmRaw * 5));
      $("#result .stats .wpm .bottom").attr(
        "aria-label",
        Misc.roundTo2(stats.wpm) + " wpm"
      );
    }

    $("#result .stats .acc .bottom").text(Misc.roundTo2(stats.acc) + "%");
    let time = Misc.roundTo2(testtime) + "s";
    if (testtime > 61) {
      time = Misc.secondsToString(Misc.roundTo2(testtime));
    }
    $("#result .stats .time .bottom .text").text(time);
    $("#result .stats .raw .bottom").removeAttr("aria-label");
    $("#result .stats .acc .bottom").removeAttr("aria-label");
    $("#result .stats .time .bottom").attr(
      "aria-label",
      `${afkseconds}s afk ${afkSecondsPercent}%`
    );
  } else {
    //not showing decimal places
    if (Config.alwaysShowCPM == false) {
      $("#result .stats .wpm .top .text").text("wpm");
      $("#result .stats .wpm .bottom").attr(
        "aria-label",
        stats.wpm + ` (${Misc.roundTo2(stats.wpm * 5)} cpm)`
      );
      if (inf) {
        $("#result .stats .wpm .bottom").text("Infinite");
      } else {
        $("#result .stats .wpm .bottom").text(Math.round(stats.wpm));
      }
      $("#result .stats .raw .bottom").text(Math.round(stats.wpmRaw));
      $("#result .stats .raw .bottom").attr("aria-label", stats.wpmRaw);
    } else {
      $("#result .stats .wpm .top .text").text("cpm");
      $("#result .stats .wpm .bottom").attr(
        "aria-label",
        Misc.roundTo2(stats.wpm * 5) + ` (${Misc.roundTo2(stats.wpm)} wpm)`
      );
      if (inf) {
        $("#result .stats .wpm .bottom").text("Infinite");
      } else {
        $("#result .stats .wpm .bottom").text(Math.round(stats.wpm * 5));
      }
      $("#result .stats .raw .bottom").text(Math.round(stats.wpmRaw * 5));
      $("#result .stats .raw .bottom").attr("aria-label", stats.wpmRaw * 5);
    }

    $("#result .stats .acc .bottom").text(Math.floor(stats.acc) + "%");
    $("#result .stats .acc .bottom").attr("aria-label", stats.acc + "%");
    let time = Math.round(testtime) + "s";
    if (testtime > 61) {
      time = Misc.secondsToString(Math.round(testtime));
    }
    $("#result .stats .time .bottom .text").text(time);
    $("#result .stats .time .bottom").attr(
      "aria-label",
      `${Misc.roundTo2(testtime)}s (${afkseconds}s afk ${afkSecondsPercent}%)`
    );
  }
  $("#result .stats .time .bottom .afk").text("");
  if (afkSecondsPercent > 0) {
    $("#result .stats .time .bottom .afk").text(afkSecondsPercent + "% afk");
  }
  $("#result .stats .key .bottom").text(testtime + "s");
  $("#words").removeClass("blurred");
  OutOfFocus.hide();
  $("#result .stats .key .bottom").text(
    stats.correctChars +
      stats.correctSpaces +
      "/" +
      stats.incorrectChars +
      "/" +
      stats.extraChars +
      "/" +
      stats.missedChars
  );

  setTimeout(function () {
    $("#resultExtraButtons").removeClass("hidden").css("opacity", 0).animate(
      {
        opacity: 1,
      },
      125
    );
  }, 125);

  $("#testModesNotice").addClass("hidden");

  $("#result .stats .leaderboards .bottom").text("");
  $("#result .stats .leaderboards").addClass("hidden");

  let mode2 = "";
  if (Config.mode === "time") {
    mode2 = Config.time;
  } else if (Config.mode === "words") {
    mode2 = Config.words;
  } else if (Config.mode === "custom") {
    mode2 = "custom";
  } else if (Config.mode === "quote") {
    mode2 = randomQuote.id;
  } else if (Config.mode === "zen") {
    mode2 = "zen";
  }

  if (TestStats.lastSecondNotRound) {
    let wpmAndRaw = liveWpmAndRaw();
    TestStats.pushToWpmHistory(wpmAndRaw.wpm);
    TestStats.pushToRawHistory(wpmAndRaw.raw);
    TestStats.pushKeypressesToHistory();
    // errorsPerSecond.push(currentError);
    // currentError = {
    //   count: 0,
    //   words: [],
    // };
  }

  let labels = [];
  for (let i = 1; i <= TestStats.wpmHistory.length; i++) {
    if (TestStats.lastSecondNotRound && i === TestStats.wpmHistory.length) {
      labels.push(Misc.roundTo2(testtime).toString());
    } else {
      labels.push(i.toString());
    }
  }

  ChartController.result.updateColors();

  ChartController.result.data.labels = labels;

  let rawWpmPerSecondRaw = TestStats.keypressPerSecond.map((f) =>
    Math.round((f.count / 5) * 60)
  );

  let rawWpmPerSecond = Misc.smooth(rawWpmPerSecondRaw, 1);

  let stddev = Misc.stdDev(rawWpmPerSecondRaw);
  let avg = Misc.mean(rawWpmPerSecondRaw);

  let consistency = Misc.roundTo2(Misc.kogasa(stddev / avg));
  let keyConsistency = Misc.roundTo2(
    Misc.kogasa(
      Misc.stdDev(TestStats.keypressTimings.spacing.array) /
        Misc.mean(TestStats.keypressTimings.spacing.array)
    )
  );

  if (isNaN(consistency)) {
    consistency = 0;
  }

  if (Config.alwaysShowDecimalPlaces) {
    $("#result .stats .consistency .bottom").text(
      Misc.roundTo2(consistency) + "%"
    );
    $("#result .stats .consistency .bottom").attr(
      "aria-label",
      `${keyConsistency}% key`
    );
  } else {
    $("#result .stats .consistency .bottom").text(
      Math.round(consistency) + "%"
    );
    $("#result .stats .consistency .bottom").attr(
      "aria-label",
      `${consistency}% (${keyConsistency}% key)`
    );
  }

  ChartController.result.data.datasets[0].data = TestStats.wpmHistory;
  ChartController.result.data.datasets[1].data = rawWpmPerSecond;

  let maxChartVal = Math.max(
    ...[Math.max(...rawWpmPerSecond), Math.max(...TestStats.wpmHistory)]
  );
  if (!Config.startGraphsAtZero) {
    ChartController.result.options.scales.yAxes[0].ticks.min = Math.min(
      ...TestStats.wpmHistory
    );
    ChartController.result.options.scales.yAxes[1].ticks.min = Math.min(
      ...TestStats.wpmHistory
    );
  } else {
    ChartController.result.options.scales.yAxes[0].ticks.min = 0;
    ChartController.result.options.scales.yAxes[1].ticks.min = 0;
  }

  // let errorsNoZero = [];

  // for (let i = 0; i < errorsPerSecond.length; i++) {
  //   errorsNoZero.push({
  //     x: i + 1,
  //     y: errorsPerSecond[i].count,
  //   });
  // }

  let errorsArray = [];
  for (let i = 0; i < TestStats.keypressPerSecond.length; i++) {
    errorsArray.push(TestStats.keypressPerSecond[i].errors);
  }

  ChartController.result.data.datasets[2].data = errorsArray;

  let kps = TestStats.keypressPerSecond.slice(
    Math.max(TestStats.keypressPerSecond.length - 5, 0)
  );

  kps = kps.map((a) => a.count);

  kps = kps.reduce((a, b) => a + b, 0);

  let afkDetected = kps === 0 ? true : false;

  if (bailout) afkDetected = false;

  $("#result .stats .tags").addClass("hidden");

  let lang = Config.language;

  let quoteLength = -1;
  if (Config.mode === "quote") {
    quoteLength = randomQuote.group;
    lang = Config.language.replace(/_\d*k$/g, "");
  }

  if (difficultyFailed) {
    Notifications.add("Test failed", 0);
  } else if (afkDetected) {
    Notifications.add("Test invalid - AFK detected", 0);
  } else if (sameWordset) {
    Notifications.add("Test invalid - repeated", 0);
  } else if (
    (Config.mode === "time" && mode2 < 15 && mode2 > 0) ||
    (Config.mode === "time" && mode2 == 0 && testtime < 15) ||
    (Config.mode === "words" && mode2 < 10 && mode2 > 0) ||
    (Config.mode === "words" && mode2 == 0 && testtime < 15) ||
    (Config.mode === "custom" &&
      !CustomText.isWordRandom &&
      !CustomText.isTimeRandom &&
      CustomText.text.length < 10) ||
    (Config.mode === "custom" &&
      CustomText.isWordRandom &&
      !CustomText.isTimeRandom &&
      CustomText.word < 10) ||
    (Config.mode === "custom" &&
      !CustomText.isWordRandom &&
      CustomText.isTimeRandom &&
      CustomText.time < 15) ||
    (Config.mode === "zen" && testtime < 15)
  ) {
    Notifications.add("Test too short", 0);
  } else {
    let activeTags = [];
    let activeTagsIds = [];
    try {
      DB.getSnapshot().tags.forEach((tag) => {
        if (tag.active === true) {
          activeTags.push(tag);
          activeTagsIds.push(tag.id);
        }
      });
    } catch (e) {}

    let chartData = {
      wpm: TestStats.wpmHistory,
      raw: rawWpmPerSecond,
      err: errorsArray,
    };

    if (testtime > 122) {
      chartData = "toolong";
      TestStats.setKeypressTimingsTooLong();
    }

    let cdata = null;
    if (Config.mode === "custom") {
      cdata = {};
      cdata.textLen = CustomText.text.length;
      cdata.isWordRandom = CustomText.isWordRandom;
      cdata.isTimeRandom = CustomText.isTimeRandom;
      cdata.word =
        CustomText.word !== "" && !isNaN(CustomText.word)
          ? CustomText.word
          : null;
      cdata.time =
        CustomText.time !== "" && !isNaN(CustomText.time)
          ? CustomText.time
          : null;
    }

    let completedEvent = {
      wpm: stats.wpm,
      rawWpm: stats.wpmRaw,
      correctChars: stats.correctChars + stats.correctSpaces,
      incorrectChars: stats.incorrectChars,
      allChars: stats.allChars,
      acc: stats.acc,
      mode: Config.mode,
      mode2: mode2,
      quoteLength: quoteLength,
      punctuation: Config.punctuation,
      numbers: Config.numbers,
      timestamp: Date.now(),
      language: lang,
      restartCount: TestStats.restartCount,
      incompleteTestSeconds:
        TestStats.incompleteSeconds < 0
          ? 0
          : Misc.roundTo2(TestStats.incompleteSeconds),
      difficulty: Config.difficulty,
      testDuration: testtime,
      afkDuration: afkseconds,
      blindMode: Config.blindMode,
      theme: Config.theme,
      tags: activeTagsIds,
      keySpacing: TestStats.keypressTimings.spacing.array,
      keyDuration: TestStats.keypressTimings.duration.array,
      consistency: consistency,
      keyConsistency: keyConsistency,
      funbox: activeFunbox,
      bailedOut: bailout,
      chartData: chartData,
      customText: cdata,
    };

    if (Config.mode !== "custom") {
      delete completedEvent.CustomText;
    }

    if (
      Config.difficulty == "normal" ||
      ((Config.difficulty == "master" || Config.difficulty == "expert") &&
        !difficultyFailed)
    ) {
      // restartCount = 0;
      // incompleteTestSeconds = 0;
      TestStats.resetIncomplete();
    }
    if (
      stats.wpm > 0 &&
      stats.wpm < 350 &&
      stats.acc > 50 &&
      stats.acc <= 100
    ) {
      if (firebase.auth().currentUser != null) {
        completedEvent.uid = firebase.auth().currentUser.uid;
        //check local pb
        AccountIcon.loading(true);
        let dontShowCrown = false;
        let pbDiff = 0;
        DB.getLocalPB(
          Config.mode,
          mode2,
          Config.punctuation,
          Config.language,
          Config.difficulty
        ).then((lpb) => {
          DB.getUserHighestWpm(
            Config.mode,
            mode2,
            Config.punctuation,
            Config.language,
            Config.difficulty
          ).then((highestwpm) => {
            hideCrown();
            $("#result .stats .wpm .crown").attr("aria-label", "");
            if (lpb < stats.wpm && stats.wpm < highestwpm) {
              dontShowCrown = true;
            }
            if (Config.mode == "quote") dontShowCrown = true;
            if (lpb < stats.wpm) {
              //new pb based on local
              pbDiff = Math.abs(stats.wpm - lpb);
              if (!dontShowCrown) {
                showCrown();
                $("#result .stats .wpm .crown").attr(
                  "aria-label",
                  "+" + Misc.roundTo2(pbDiff)
                );
              }
            }
            if (lpb > 0) {
              ChartController.result.options.annotation.annotations.push({
                enabled: false,
                type: "line",
                mode: "horizontal",
                scaleID: "wpm",
                value: lpb,
                borderColor: ThemeColors.sub,
                borderWidth: 1,
                borderDash: [2, 2],
                label: {
                  backgroundColor: ThemeColors.sub,
                  fontFamily: Config.fontFamily.replace(/_/g, " "),
                  fontSize: 11,
                  fontStyle: "normal",
                  fontColor: ThemeColors.bg,
                  xPadding: 6,
                  yPadding: 6,
                  cornerRadius: 3,
                  position: "center",
                  enabled: true,
                  content: `PB: ${lpb}`,
                },
              });
              if (maxChartVal >= lpb - 15 && maxChartVal <= lpb + 15) {
                maxChartVal = lpb + 15;
              }
              ChartController.result.options.scales.yAxes[0].ticks.max = Math.round(
                maxChartVal
              );
              ChartController.result.options.scales.yAxes[1].ticks.max = Math.round(
                maxChartVal
              );
              ChartController.result.update({ duration: 0 });
            }
            if (Config.mode === "time" && (mode2 === 15 || mode2 === 60)) {
              $("#result .stats .leaderboards").removeClass("hidden");
              $("#result .stats .leaderboards .bottom").html("checking...");
            }

            if (activeTags.length == 0) {
              $("#result .stats .tags").addClass("hidden");
            } else {
              $("#result .stats .tags").removeClass("hidden");
            }
            $("#result .stats .tags .bottom").text("");
            let annotationSide = "left";
            activeTags.forEach(async (tag) => {
              let tpb = await DB.getLocalTagPB(
                tag.id,
                Config.mode,
                mode2,
                Config.punctuation,
                Config.language,
                Config.difficulty
              );
              $("#result .stats .tags .bottom").append(`
                <div tagid="${tag.id}" aria-label="PB: ${tpb}" data-balloon-pos="up">${tag.name}<i class="fas fa-crown hidden"></i></div>
              `);
              if (Config.mode != "quote") {
                if (tpb < stats.wpm) {
                  //new pb for that tag
                  DB.saveLocalTagPB(
                    tag.id,
                    Config.mode,
                    mode2,
                    Config.punctuation,
                    Config.language,
                    Config.difficulty,
                    stats.wpm,
                    stats.acc,
                    stats.wpmRaw,
                    consistency
                  );
                  $(
                    `#result .stats .tags .bottom div[tagid="${tag.id}"] .fas`
                  ).removeClass("hidden");
                  $(`#result .stats .tags .bottom div[tagid="${tag.id}"]`).attr(
                    "aria-label",
                    "+" + Misc.roundTo2(stats.wpm - tpb)
                  );
                  // console.log("new pb for tag " + tag.name);
                } else {
                  ChartController.result.options.annotation.annotations.push({
                    enabled: false,
                    type: "line",
                    mode: "horizontal",
                    scaleID: "wpm",
                    value: tpb,
                    borderColor: ThemeColors.sub,
                    borderWidth: 1,
                    borderDash: [2, 2],
                    label: {
                      backgroundColor: ThemeColors.sub,
                      fontFamily: Config.fontFamily.replace(/_/g, " "),
                      fontSize: 11,
                      fontStyle: "normal",
                      fontColor: ThemeColors.bg,
                      xPadding: 6,
                      yPadding: 6,
                      cornerRadius: 3,
                      position: annotationSide,
                      enabled: true,
                      content: `${tag.name} PB: ${tpb}`,
                    },
                  });
                  if (annotationSide === "left") {
                    annotationSide = "right";
                  } else {
                    annotationSide = "left";
                  }
                }
              }
            });

            CloudFunctions.testCompleted({
              uid: firebase.auth().currentUser.uid,
              obj: completedEvent,
            })
              .then((e) => {
                AccountIcon.loading(false);
                if (e.data == null) {
                  Notifications.add(
                    "Unexpected response from the server: " + e.data,
                    -1
                  );
                  return;
                }
                if (e.data.resultCode === -1) {
                  Notifications.add("Could not save result", -1);
                } else if (e.data.resultCode === -2) {
                  Notifications.add(
                    "Possible bot detected. Result not saved.",
                    -1
                  );
                } else if (e.data.resultCode === -3) {
                  Notifications.add(
                    "Could not verify keypress stats. Result not saved.",
                    -1
                  );
                } else if (e.data.resultCode === -4) {
                  Notifications.add(
                    "Result data does not make sense. Result not saved.",
                    -1
                  );
                } else if (e.data.resultCode === -5) {
                  Notifications.add("Test too short. Result not saved.", -1);
                } else if (e.data.resultCode === -999) {
                  console.error("internal error: " + e.data.message);
                  Notifications.add(
                    "Internal error. Result might not be saved. " +
                      e.data.message,
                    -1
                  );
                } else if (e.data.resultCode === 1 || e.data.resultCode === 2) {
                  completedEvent.id = e.data.createdId;
                  if (e.data.resultCode === 2) {
                    completedEvent.isPb = true;
                  }
                  if (
                    DB.getSnapshot() !== null &&
                    DB.getSnapshot().results !== undefined
                  ) {
                    DB.getSnapshot().results.unshift(completedEvent);
                    if (DB.getSnapshot().globalStats.time == undefined) {
                      DB.getSnapshot().globalStats.time =
                        testtime +
                        completedEvent.incompleteTestSeconds -
                        afkseconds;
                    } else {
                      DB.getSnapshot().globalStats.time +=
                        testtime +
                        completedEvent.incompleteTestSeconds -
                        afkseconds;
                    }
                    if (DB.getSnapshot().globalStats.started == undefined) {
                      DB.getSnapshot().globalStats.started =
                        TestStats.restartCount + 1;
                    } else {
                      DB.getSnapshot().globalStats.started +=
                        TestStats.restartCount + 1;
                    }
                    if (DB.getSnapshot().globalStats.completed == undefined) {
                      DB.getSnapshot().globalStats.completed = 1;
                    } else {
                      DB.getSnapshot().globalStats.completed += 1;
                    }
                  }
                  try {
                    firebase
                      .analytics()
                      .logEvent("testCompleted", completedEvent);
                  } catch (e) {
                    console.log("Analytics unavailable");
                  }

                  if (
                    Config.mode === "time" &&
                    (mode2 == "15" || mode2 == "60") &&
                    DB.getSnapshot() !== null
                  ) {
                    const lbUpIcon = `<i class="fas fa-angle-up"></i>`;
                    const lbDownIcon = `<i class="fas fa-angle-down"></i>`;
                    const lbRightIcon = `<i class="fas fa-angle-right"></i>`;

                    //global
                    let globalLbString = "";
                    const glb = e.data.globalLeaderboard;
                    let glbMemory;
                    try {
                      glbMemory = DB.getSnapshot().lbMemory[Config.mode + mode2]
                        .global;
                    } catch {
                      glbMemory = null;
                    }
                    let dontShowGlobalDiff =
                      glbMemory == null || glbMemory === -1 ? true : false;
                    let globalLbDiff = null;
                    if (glb === null) {
                      globalLbString = "global: not found";
                    } else if (glb.insertedAt === -1) {
                      dontShowGlobalDiff = true;
                      globalLbDiff = glbMemory - glb.insertedAt;
                      DB.updateLbMemory(
                        Config.mode,
                        mode2,
                        "global",
                        glb.insertedAt
                      );

                      globalLbString = "global: not qualified";
                    } else if (glb.insertedAt >= 0) {
                      if (glb.newBest) {
                        globalLbDiff = glbMemory - glb.insertedAt;
                        DB.updateLbMemory(
                          Config.mode,
                          mode2,
                          "global",
                          glb.insertedAt
                        );
                        let str = Misc.getPositionString(glb.insertedAt + 1);
                        globalLbString = `global: ${str}`;
                      } else {
                        globalLbDiff = glbMemory - glb.foundAt;
                        DB.updateLbMemory(
                          Config.mode,
                          mode2,
                          "global",
                          glb.foundAt
                        );
                        let str = Misc.getPositionString(glb.foundAt + 1);
                        globalLbString = `global: ${str}`;
                      }
                    }
                    if (!dontShowGlobalDiff) {
                      let sString =
                        globalLbDiff === 1 || globalLbDiff === -1 ? "" : "s";
                      if (globalLbDiff > 0) {
                        globalLbString += ` <span class="lbChange" aria-label="You've gained ${globalLbDiff} position${sString}" data-balloon-pos="left">(${lbUpIcon}${globalLbDiff})</span>`;
                      } else if (globalLbDiff === 0) {
                        globalLbString += ` <span class="lbChange" aria-label="Your position remained the same" data-balloon-pos="left">(${lbRightIcon}${globalLbDiff})</span>`;
                      } else if (globalLbDiff < 0) {
                        globalLbString += ` <span class="lbChange" aria-label="You've lost ${globalLbDiff} position${sString}" data-balloon-pos="left">(${lbDownIcon}${globalLbDiff})</span>`;
                      }
                    }

                    //daily
                    let dailyLbString = "";
                    const dlb = e.data.dailyLeaderboard;
                    let dlbMemory;
                    try {
                      dlbMemory = DB.getSnapshot().lbMemory[Config.mode + mode2]
                        .daily;
                    } catch {
                      dlbMemory = null;
                    }
                    let dontShowDailyDiff =
                      dlbMemory == null || dlbMemory === -1 ? true : false;
                    let dailyLbDiff = null;
                    if (dlb === null) {
                      dailyLbString = "daily: not found";
                    } else if (dlb.insertedAt === -1) {
                      dontShowDailyDiff = true;
                      dailyLbDiff = dlbMemory - dlb.insertedAt;
                      DB.updateLbMemory(
                        Config.mode,
                        mode2,
                        "daily",
                        dlb.insertedAt
                      );
                      dailyLbString = "daily: not qualified";
                    } else if (dlb.insertedAt >= 0) {
                      if (dlb.newBest) {
                        dailyLbDiff = dlbMemory - dlb.insertedAt;
                        DB.updateLbMemory(
                          Config.mode,
                          mode2,
                          "daily",
                          dlb.insertedAt
                        );
                        let str = Misc.getPositionString(dlb.insertedAt + 1);
                        dailyLbString = `daily: ${str}`;
                      } else {
                        dailyLbDiff = dlbMemory - dlb.foundAt;
                        DB.updateLbMemory(
                          Config.mode,
                          mode2,
                          "daily",
                          dlb.foundAt
                        );
                        let str = Misc.getPositionString(dlb.foundAt + 1);
                        dailyLbString = `daily: ${str}`;
                      }
                    }
                    if (!dontShowDailyDiff) {
                      let sString =
                        dailyLbDiff === 1 || dailyLbDiff === -1 ? "" : "s";
                      if (dailyLbDiff > 0) {
                        dailyLbString += ` <span class="lbChange" aria-label="You've gained ${dailyLbDiff} position${sString}" data-balloon-pos="left">(${lbUpIcon}${dailyLbDiff})</span>`;
                      } else if (dailyLbDiff === 0) {
                        dailyLbString += ` <span class="lbChange" aria-label="Your position remained the same" data-balloon-pos="left">(${lbRightIcon}${dailyLbDiff})</span>`;
                      } else if (dailyLbDiff < 0) {
                        dailyLbString += ` <span class="lbChange" aria-label="You've lost ${dailyLbDiff} position${sString}" data-balloon-pos="left">(${lbDownIcon}${dailyLbDiff})</span>`;
                      }
                    }
                    $("#result .stats .leaderboards .bottom").html(
                      globalLbString + "<br>" + dailyLbString
                    );

                    // CloudFunctions.saveLbMemory({
                    //   uid: firebase.auth().currentUser.uid,
                    //   obj: DB.getSnapshot().lbMemory,
                    // }).then((d) => {
                    //   if (d.data.returnCode === 1) {
                    //   } else {
                    //     Notifications.add(
                    //       `Error saving lb memory ${d.data.message}`,
                    //       4000
                    //     );
                    //   }
                    // });
                  }
                  if (
                    e.data.dailyLeaderboard === null &&
                    e.data.globalLeaderboard === null
                  ) {
                    $("#result .stats .leaderboards").addClass("hidden");
                  }
                  if (e.data.needsToVerifyEmail === true) {
                    $("#result .stats .leaderboards").removeClass("hidden");
                    $("#result .stats .leaderboards .bottom").html(
                      `please verify your email<br>to access leaderboards - <a onClick="sendVerificationEmail()">resend email</a>`
                    );
                  } else if (e.data.lbBanned) {
                    $("#result .stats .leaderboards").removeClass("hidden");
                    $("#result .stats .leaderboards .bottom").html("banned");
                  } else if (e.data.name === false) {
                    $("#result .stats .leaderboards").removeClass("hidden");
                    $("#result .stats .leaderboards .bottom").html(
                      "update your name to access leaderboards"
                    );
                  } else if (e.data.needsToVerify === true) {
                    $("#result .stats .leaderboards").removeClass("hidden");
                    $("#result .stats .leaderboards .bottom").html(
                      "verification needed to access leaderboards"
                    );
                  }

                  if (e.data.resultCode === 2) {
                    //new pb
                    showCrown();
                    DB.saveLocalPB(
                      Config.mode,
                      mode2,
                      Config.punctuation,
                      Config.language,
                      Config.difficulty,
                      stats.wpm,
                      stats.acc,
                      stats.wpmRaw,
                      consistency
                    );
                  } else if (e.data.resultCode === 1) {
                    hideCrown();
                    // if (localPb) {
                    //   Notifications.add(
                    //     "Local PB data is out of sync! Refresh the page to resync it or contact Miodec on Discord.",
                    //     15000
                    //   );
                    // }
                  }
                }
              })
              .catch((e) => {
                AccountIcon.loading(false);
                console.error(e);
                Notifications.add("Could not save result. " + e, -1);
              });
          });
        });
      } else {
        try {
          firebase.analytics().logEvent("testCompletedNoLogin", completedEvent);
        } catch (e) {
          console.log("Analytics unavailable");
        }
        notSignedInLastResult = completedEvent;
      }
    } else {
      Notifications.add("Test invalid", 0);
      TestStats.setInvalid();
      try {
        firebase.analytics().logEvent("testCompletedInvalid", completedEvent);
      } catch (e) {
        console.log("Analytics unavailable");
      }
    }
  }

  if (firebase.auth().currentUser != null) {
    $("#result .loginTip").addClass("hidden");
  } else {
    $("#result .stats .leaderboards").addClass("hidden");
    $("#result .loginTip").removeClass("hidden");
  }

  let testType = "";

  if (Config.mode === "quote") {
    let qlen = "";
    if (Config.quoteLength === 0) {
      qlen = "short ";
    } else if (Config.quoteLength === 1) {
      qlen = "medium ";
    } else if (Config.quoteLength === 2) {
      qlen = "long ";
    } else if (Config.quoteLength === 3) {
      qlen = "thicc ";
    }
    testType += qlen + Config.mode;
  } else {
    testType += Config.mode;
  }
  if (Config.mode == "time") {
    testType += " " + Config.time;
  } else if (Config.mode == "words") {
    testType += " " + Config.words;
  }
  if (
    Config.mode != "custom" &&
    activeFunbox !== "gibberish" &&
    activeFunbox !== "58008"
  ) {
    testType += "<br>" + lang;
  }
  if (Config.punctuation) {
    testType += "<br>punctuation";
  }
  if (Config.numbers) {
    testType += "<br>numbers";
  }
  if (Config.blindMode) {
    testType += "<br>blind";
  }
  if (activeFunbox !== "none") {
    testType += "<br>" + activeFunbox.replace(/_/g, " ");
  }
  if (Config.difficulty == "expert") {
    testType += "<br>expert";
  } else if (Config.difficulty == "master") {
    testType += "<br>master";
  }

  $("#result .stats .testType .bottom").html(testType);

  let otherText = "";
  if (Config.layout !== "default") {
    otherText += "<br>" + Config.layout;
  }
  if (difficultyFailed) {
    otherText += "<br>failed";
  }
  if (afkDetected) {
    otherText += "<br>afk detected";
  }
  if (TestStats.invalid) {
    otherText += "<br>invalid";
  }
  if (sameWordset) {
    otherText += "<br>repeated";
  }
  if (bailout) {
    otherText += "<br>bailed out";
  }

  if (otherText == "") {
    $("#result .stats .info").addClass("hidden");
  } else {
    $("#result .stats .info").removeClass("hidden");
    otherText = otherText.substring(4);
    $("#result .stats .info .bottom").html(otherText);
  }

  if (
    $("#result .stats .tags").hasClass("hidden") &&
    $("#result .stats .info").hasClass("hidden")
  ) {
    $("#result .stats .infoAndTags").addClass("hidden");
  } else {
    $("#result .stats .infoAndTags").removeClass("hidden");
  }

  if (Config.mode === "quote") {
    $("#result .stats .source").removeClass("hidden");
    $("#result .stats .source .bottom").html(randomQuote.source);
  } else {
    $("#result .stats .source").addClass("hidden");
  }

  ChartController.result.options.scales.yAxes[0].ticks.max = maxChartVal;
  ChartController.result.options.scales.yAxes[1].ticks.max = maxChartVal;

  ChartController.result.update({ duration: 0 });
  ChartController.result.resize();
  swapElements($("#typingTest"), $("#result"), 250, () => {
    TestUI.setResultCalculating(false);
    $("#words").empty();
    ChartController.result.resize();
    if (Config.alwaysShowWordsHistory) {
      toggleResultWordsDisplay();
    }
  });
}

function startTest() {
  if (pageTransition) {
    return false;
  }
  if (!dbConfigLoaded) {
    configChangedBeforeDb = true;
  }
  try {
    if (firebase.auth().currentUser != null) {
      firebase.analytics().logEvent("testStarted");
    } else {
      firebase.analytics().logEvent("testStartedNoLogin");
    }
  } catch (e) {
    console.log("Analytics unavailable");
  }
  testActive = true;
  TestStats.setStart(performance.now());
  TestStats.resetKeypressTimings();
  restartTimer();
  showTimer();
  $("#liveWpm").text("0");
  LiveWpm.show();
  LiveAcc.show();
  updateTimer();
  clearTimeout(timer);

  if (activeFunbox === "memory") {
    memoryFunboxInterval = clearInterval(memoryFunboxInterval);
    memoryFunboxTimer = null;
    $("#wordsWrapper").addClass("hidden");
  }

  try {
    if (Config.paceCaret !== "off")
      movePaceCaret(performance.now() + paceCaret.spc * 1000);
  } catch (e) {}
  //use a recursive self-adjusting timer to avoid time drift
  const stepIntervalMS = 1000;
  (function loop(expectedStepEnd) {
    const delay = expectedStepEnd - performance.now();
    timer = setTimeout(function () {
      time++;
      $(".pageTest #premidSecondsLeft").text(Config.time - time);
      if (
        Config.mode === "time" ||
        (Config.mode === "custom" && CustomText.isTimeRandom)
      ) {
        updateTimer();
      }
      let wpmAndRaw = liveWpmAndRaw();
      LiveWpm.update(wpmAndRaw.wpm, wpmAndRaw.raw);
      TestStats.pushToWpmHistory(wpmAndRaw.wpm);
      TestStats.pushToRawHistory(wpmAndRaw.raw);
      Monkey.updateFastOpacity(wpmAndRaw.wpm);

      let acc = Misc.roundTo2(TestStats.calculateAccuracy());

      if (activeFunbox === "layoutfluid" && Config.mode === "time") {
        const layouts = ["qwerty", "dvorak", "colemak"];
        let index = 0;
        index = Math.floor(time / (Config.time / 3));

        if (
          time == Math.floor(Config.time / 3) - 3 ||
          time == (Config.time / 3) * 2 - 3
        ) {
          Notifications.add("3", 0, 1);
        }
        if (
          time == Math.floor(Config.time / 3) - 2 ||
          time == Math.floor(Config.time / 3) * 2 - 2
        ) {
          Notifications.add("2", 0, 1);
        }
        if (
          time == Math.floor(Config.time / 3) - 1 ||
          time == Math.floor(Config.time / 3) * 2 - 1
        ) {
          Notifications.add("1", 0, 1);
        }

        if (Config.layout !== layouts[index] && layouts[index] !== undefined) {
          Notifications.add(`--- !!! ${layouts[index]} !!! ---`, 0);
        }
        setLayout(layouts[index]);
        setKeymapLayout(layouts[index]);
        Keymap.highlightKey(
          wordsList[currentWordIndex]
            .substring(currentInput.length, currentInput.length + 1)
            .toString()
            .toUpperCase()
        );
        settingsGroups.layout.updateButton();
      }

      TestStats.pushKeypressesToHistory();
      if (
        (Config.minWpm === "custom" &&
          wpmAndRaw.wpm < parseInt(Config.minWpmCustomSpeed) &&
          currentWordIndex > 3) ||
        (Config.minAcc === "custom" && acc < parseInt(Config.minAccCustom))
      ) {
        clearTimeout(timer);
        failTest();
        return;
      }
      if (
        Config.mode == "time" ||
        (Config.mode === "custom" && CustomText.isTimeRandom)
      ) {
        if (
          (time >= Config.time &&
            Config.time !== 0 &&
            Config.mode === "time") ||
          (time >= CustomText.time &&
            CustomText.time !== 0 &&
            Config.mode === "custom")
        ) {
          //times up
          clearTimeout(timer);
          Caret.hide();
          inputHistory.push(currentInput);
          correctedHistory.push(currentCorrected);
          showResult();
          return;
        }
      }
      loop(expectedStepEnd + stepIntervalMS);
    }, delay);
  })(TestStats.start + stepIntervalMS);
  return true;
}

function restartTest(withSameWordset = false, nosave = false, event) {
  // if (!manualRestart) {
  //   if (
  //     (Config.mode === "words" && Config.words < 1000 && Config.words > 0) ||
  //     (Config.mode === "time" && Config.time < 3600 && Config.time > 0) ||
  //     Config.mode === "quote" ||
  //     (Config.mode === "custom" &&
  //       CustomText.isWordRandom &&
  //       CustomText.word < 1000 &&
  //       CustomText.word != 0) ||
  //     (Config.mode === "custom" &&
  //       CustomText.isTimeRandom &&
  //       CustomText.time < 3600 &&
  //       CustomText.time != 0) ||
  //     (Config.mode === "custom" &&
  //       !CustomText.isWordRandom &&
  //       CustomText.text.length < 1000)
  //   ) {
  //   } else {
  //     if (testActive) {
  //       Notifications.add(
  //         "Restart disabled for long tests. Use your mouse to confirm.",
  //         0
  //       );
  //       return;
  //     }
  //   }
  // }

  if (TestUI.testRestarting || TestUI.resultCalculating) {
    try {
      event.preventDefault();
    } catch {}
    return;
  }
  if ($(".pageTest").hasClass("active") && !TestUI.resultVisible) {
    if (!ManualRestart.get()) {
      // if ((textHasTab && manualRestart) || !textHasTab) {
      if (textHasTab) {
        try {
          if (!event.shiftKey) return;
        } catch {}
      }
      try {
        if (Config.mode !== "zen") event.preventDefault();
      } catch {}
      if (
        !Misc.canQuickRestart(
          Config.mode,
          Config.words,
          Config.time,
          CustomText
        )
      ) {
        let message = "Use your mouse to confirm.";
        if (Config.quickTab)
          message = "Press shift + tab or use your mouse to confirm.";
        Notifications.add("Quick restart disabled. " + message, 0, 3);
        return;
      }
      // }else{
      //   return;
      // }
    }
  }

  if (testActive) {
    TestStats.pushKeypressesToHistory();
    let testSeconds = TestStats.calculateTestSeconds(performance.now());
    let afkseconds = TestStats.calculateAfkSeconds();
    // incompleteTestSeconds += ;
    TestStats.incrementIncompleteSeconds(testSeconds - afkseconds);
    TestStats.incrementRestartCount();
    // restartCount++;
  }

  if (Config.mode == "zen") {
    $("#words").empty();
  }

  if (PractiseMissed.before.mode !== null && !withSameWordset) {
    Notifications.add("Reverting to previous settings.", 0);
    setMode(PractiseMissed.before.mode);
    setPunctuation(PractiseMissed.before.punctuation);
    setNumbers(PractiseMissed.before.numbers);
    PractiseMissed.resetBefore();
  }

  ManualRestart.reset();
  clearTimeout(timer);
  time = 0;
  TestStats.restart();
  currentCorrected = "";
  correctedHistory = [];
  ShiftTracker.reset();
  Focus.set(false);
  Caret.hide();
  testActive = false;
  LiveWpm.hide();
  LiveAcc.hide();
  hideTimer();
  bailout = false;
  paceCaret = null;
  if (paceCaret !== null) clearTimeout(paceCaret.timeout);
  $("#showWordHistoryButton").removeClass("loaded");
  focusWords();

  TestUI.reset();

  $("#timerNumber").css("opacity", 0);
  let el = null;
  if (TestUI.resultVisible) {
    //results are being displayed
    el = $("#result");
  } else {
    //words are being displayed
    el = $("#typingTest");
  }
  if (TestUI.resultVisible) {
    if (
      Config.randomTheme !== "off" &&
      !pageTransition &&
      !Config.customTheme
    ) {
      ThemeController.randomiseTheme();
    }
  }
  TestUI.setResultVisible(false);
  pageTransition = true;
  TestUI.setTestRestarting(true);
  el.stop(true, true).animate(
    {
      opacity: 0,
    },
    125,
    async () => {
      $("#monkey .fast").stop(true, true).css("opacity", 0);
      $("#monkey").stop(true, true).css({ animationDuration: "0s" });
      $("#typingTest").css("opacity", 0).removeClass("hidden");
      if (!withSameWordset) {
        sameWordset = false;
        textHasTab = false;
        await initWords();
        initPaceCaret(nosave);
      } else {
        sameWordset = true;
        testActive = false;
        currentWordIndex = 0;
        inputHistory = [];
        currentInput = "";
        initPaceCaret();
        showWords();
      }
      if (Config.mode === "quote") {
        sameWordset = false;
      }
      if (Config.keymapMode !== "off") {
        Keymap.show();
      } else {
        Keymap.hide();
      }
      document.querySelector("#miniTimerAndLiveWpm .wpm").innerHTML = "0";
      document.querySelector("#miniTimerAndLiveWpm .acc").innerHTML = "100%";
      document.querySelector("#liveWpm").innerHTML = "0";
      document.querySelector("#liveAcc").innerHTML = "100%";

      if (activeFunbox === "memory") {
        memoryFunboxInterval = clearInterval(memoryFunboxInterval);
        memoryFunboxTimer = Math.round(Math.pow(wordsList.length, 1.2));
        memoryFunboxInterval = setInterval(() => {
          memoryFunboxTimer -= 1;
          Notifications.add(
            memoryFunboxTimer == 0 ? "Times up" : memoryFunboxTimer,
            0,
            1
          );
          if (memoryFunboxTimer <= 0) {
            memoryFunboxInterval = clearInterval(memoryFunboxInterval);
            memoryFunboxTimer = null;
            $("#wordsWrapper").addClass("hidden");
          }
        }, 1000);

        if (Config.keymapMode === "next") {
          setKeymapMode("react");
        }
      }

      let mode2 = "";
      if (Config.mode === "time") {
        mode2 = Config.time;
      } else if (Config.mode === "words") {
        mode2 = Config.words;
      } else if (Config.mode === "custom") {
        mode2 = "custom";
      } else if (Config.mode === "quote") {
        mode2 = randomQuote.id;
      }
      let fbtext = "";
      if (activeFunbox !== "none") {
        fbtext = " " + activeFunbox;
      }
      $(".pageTest #premidTestMode").text(
        `${Config.mode} ${mode2} ${Config.language}${fbtext}`
      );
      $(".pageTest #premidSecondsLeft").text(Config.time);

      if (activeFunbox === "layoutfluid") {
        setLayout("qwerty");
        settingsGroups.layout.updateButton();
        setKeymapLayout("qwerty");
        settingsGroups.keymapLayout.updateButton();
        Keymap.highlightKey(
          wordsList[currentWordIndex]
            .substring(currentInput.length, currentInput.length + 1)
            .toString()
            .toUpperCase()
        );
      }

      $("#result").addClass("hidden");
      $("#testModesNotice").removeClass("hidden").css({
        opacity: 1,
      });
      resetPaceCaret();
      $("#typingTest")
        .css("opacity", 0)
        .removeClass("hidden")
        .stop(true, true)
        .animate(
          {
            opacity: 1,
          },
          125,
          () => {
            TestUI.setTestRestarting(false);
            resetPaceCaret();
            hideCrown();
            clearTimeout(timer);
            if ($("#commandLineWrapper").hasClass("hidden")) focusWords();
            ChartController.result.update();
            TestUI.updateModesNotice(
              sameWordset,
              textHasTab,
              paceCaret,
              activeFunbox
            );
            pageTransition = false;
            // console.log(TestStats.incompleteSeconds);
            // console.log(TestStats.restartCount);
          }
        );
    }
  );
}

function changePage(page) {
  if (pageTransition) {
    return;
  }
  let activePage = $(".page.active");
  $(".page").removeClass("active");
  $("#wordsInput").focusout();
  if (page == "test" || page == "") {
    pageTransition = true;
    swapElements(activePage, $(".page.pageTest"), 250, () => {
      pageTransition = false;
      focusWords();
      $(".page.pageTest").addClass("active");
      history.pushState("/", null, "/");
    });
    showTestConfig();
    hideSignOutButton();
    // restartCount = 0;
    // incompleteTestSeconds = 0;
    TestStats.resetIncomplete();
    ManualRestart.set();
    restartTest();
  } else if (page == "about") {
    pageTransition = true;
    restartTest();
    swapElements(activePage, $(".page.pageAbout"), 250, () => {
      pageTransition = false;
      history.pushState("about", null, "about");
      $(".page.pageAbout").addClass("active");
    });
    hideTestConfig();
    hideSignOutButton();
  } else if (page == "settings") {
    pageTransition = true;
    restartTest();
    swapElements(activePage, $(".page.pageSettings"), 250, () => {
      pageTransition = false;
      history.pushState("settings", null, "settings");
      $(".page.pageSettings").addClass("active");
    });
    updateSettingsPage();
    hideTestConfig();
    hideSignOutButton();
  } else if (page == "account") {
    if (!firebase.auth().currentUser) {
      changePage("login");
    } else {
      pageTransition = true;
      restartTest();
      swapElements(activePage, $(".page.pageAccount"), 250, () => {
        pageTransition = false;
        history.pushState("account", null, "account");
        $(".page.pageAccount").addClass("active");
      });
      refreshAccountPage();
      hideTestConfig();
      showSignOutButton();
    }
  } else if (page == "login") {
    if (firebase.auth().currentUser != null) {
      changePage("account");
    } else {
      pageTransition = true;
      restartTest();
      swapElements(activePage, $(".page.pageLogin"), 250, () => {
        pageTransition = false;
        history.pushState("login", null, "login");
        $(".page.pageLogin").addClass("active");
      });
      hideTestConfig();
      hideSignOutButton();
    }
  }
}

function setMode(mode, nosave) {
  if (TestUI.testRestarting) return;
  if (mode !== "words" && activeFunbox === "memory") {
    Notifications.add("Memory funbox can only be used with words mode.", 0);
    return;
  }

  ConfigSet.mode(mode);
  $("#top .config .mode .text-button").removeClass("active");
  $("#top .config .mode .text-button[mode='" + mode + "']").addClass("active");
  if (Config.mode == "time") {
    $("#top .config .wordCount").addClass("hidden");
    $("#top .config .time").removeClass("hidden");
    $("#top .config .customText").addClass("hidden");
    $("#top .config .punctuationMode").removeClass("disabled");
    $("#top .config .numbersMode").removeClass("disabled");
    $("#top .config .punctuationMode").removeClass("hidden");
    $("#top .config .numbersMode").removeClass("hidden");
    $("#top .config .quoteLength").addClass("hidden");
  } else if (Config.mode == "words") {
    $("#top .config .wordCount").removeClass("hidden");
    $("#top .config .time").addClass("hidden");
    $("#top .config .customText").addClass("hidden");
    $("#top .config .punctuationMode").removeClass("disabled");
    $("#top .config .numbersMode").removeClass("disabled");
    $("#top .config .punctuationMode").removeClass("hidden");
    $("#top .config .numbersMode").removeClass("hidden");
    $("#top .config .quoteLength").addClass("hidden");
  } else if (Config.mode == "custom") {
    if (
      activeFunbox === "58008" ||
      activeFunbox === "gibberish" ||
      activeFunbox === "ascii"
    ) {
      activeFunbox = "none";
      TestUI.updateModesNotice(
        sameWordset,
        textHasTab,
        paceCaret,
        activeFunbox
      );
    }
    $("#top .config .wordCount").addClass("hidden");
    $("#top .config .time").addClass("hidden");
    $("#top .config .customText").removeClass("hidden");
    $("#top .config .punctuationMode").removeClass("disabled");
    $("#top .config .numbersMode").removeClass("disabled");
    $("#top .config .punctuationMode").removeClass("hidden");
    $("#top .config .numbersMode").removeClass("hidden");
    $("#top .config .quoteLength").addClass("hidden");
    setPunctuation(false, true);
    setNumbers(false, true);
  } else if (Config.mode == "quote") {
    setToggleSettings(false, nosave);
    $("#top .config .wordCount").addClass("hidden");
    $("#top .config .time").addClass("hidden");
    $("#top .config .customText").addClass("hidden");
    $("#top .config .punctuationMode").addClass("disabled");
    $("#top .config .numbersMode").addClass("disabled");
    $("#top .config .punctuationMode").removeClass("hidden");
    $("#top .config .numbersMode").removeClass("hidden");
    $("#result .stats .source").removeClass("hidden");
    $("#top .config .quoteLength").removeClass("hidden");
  } else if (Config.mode == "zen") {
    $("#top .config .wordCount").addClass("hidden");
    $("#top .config .time").addClass("hidden");
    $("#top .config .customText").addClass("hidden");
    $("#top .config .punctuationMode").addClass("hidden");
    $("#top .config .numbersMode").addClass("hidden");
    $("#top .config .quoteLength").addClass("hidden");
    if (Config.paceCaret != "off") {
      Notifications.add(`Pace caret will not work with zen mode.`, 0);
    }
    // setPaceCaret("off", true);
  }
  if (!nosave) saveConfigToCookie();
}

function liveWpmAndRaw() {
  let chars = 0;
  let correctWordChars = 0;
  let spaces = 0;
  for (let i = 0; i < inputHistory.length; i++) {
    let word = Config.mode == "zen" ? inputHistory[i] : wordsList[i];
    if (inputHistory[i] == word) {
      //the word is correct
      //+1 for space
      correctWordChars += word.length;
      if (
        i < inputHistory.length - 1 &&
        Misc.getLastChar(inputHistory[i]) !== "\n"
      ) {
        spaces++;
      }
    }
    chars += inputHistory[i].length;
  }
  if (wordsList[currentWordIndex] == currentInput) {
    correctWordChars += currentInput.length;
  }
  if (activeFunbox === "nospace") {
    spaces = 0;
  }
  chars += currentInput.length;
  let testSeconds = TestStats.calculateTestSeconds(performance.now());
  let wpm = Math.round(((correctWordChars + spaces) * (60 / testSeconds)) / 5);
  let raw = Math.round(((chars + spaces) * (60 / testSeconds)) / 5);
  return {
    wpm: wpm,
    raw: raw,
  };
}

function toggleResultWordsDisplay() {
  if (TestUI.resultVisible) {
    if ($("#resultWordsHistory").stop(true, true).hasClass("hidden")) {
      //show

      if (!$("#showWordHistoryButton").hasClass("loaded")) {
        $("#words").html(
          `<div class="preloader"><i class="fas fa-fw fa-spin fa-circle-notch"></i></div>`
        );
        loadWordsHistory().then(() => {
          $("#resultWordsHistory")
            .removeClass("hidden")
            .css("display", "none")
            .slideDown(250);
        });
      } else {
        $("#resultWordsHistory")
          .removeClass("hidden")
          .css("display", "none")
          .slideDown(250);
      }
    } else {
      //hide

      $("#resultWordsHistory").slideUp(250, () => {
        $("#resultWordsHistory").addClass("hidden");
      });
    }
  }
}

async function loadWordsHistory() {
  $("#resultWordsHistory .words").empty();
  let wordsHTML = "";
  for (let i = 0; i < inputHistory.length + 2; i++) {
    let input = inputHistory[i];
    let word = wordsList[i];
    let wordEl = "";
    try {
      if (input === "") throw new Error("empty input word");
      if (correctedHistory[i] !== undefined && correctedHistory[i] !== "") {
        wordEl = `<div class='word' input="${correctedHistory[i]
          .replace(/"/g, "&quot;")
          .replace(/ /g, "_")}">`;
      } else {
        wordEl = `<div class='word' input="${input
          .replace(/"/g, "&quot;")
          .replace(/ /g, "_")}">`;
      }
      if (i === inputHistory.length - 1) {
        //last word
        let wordstats = {
          correct: 0,
          incorrect: 0,
          missed: 0,
        };
        let length = Config.mode == "zen" ? input.length : word.length;
        for (let c = 0; c < length; c++) {
          if (c < input.length) {
            //on char that still has a word list pair
            if (Config.mode == "zen" || input[c] == word[c]) {
              wordstats.correct++;
            } else {
              wordstats.incorrect++;
            }
          } else {
            //on char that is extra
            wordstats.missed++;
          }
        }
        if (wordstats.incorrect !== 0 || Config.mode !== "time") {
          if (Config.mode != "zen" && input !== word) {
            wordEl = `<div class='word error' input="${input
              .replace(/"/g, "&quot;")
              .replace(/ /g, "_")}">`;
          }
        }
      } else {
        if (Config.mode != "zen" && input !== word) {
          wordEl = `<div class='word error' input="${input
            .replace(/"/g, "&quot;")
            .replace(/ /g, "_")}">`;
        }
      }

      let loop;
      if (Config.mode == "zen" || input.length > word.length) {
        //input is longer - extra characters possible (loop over input)
        loop = input.length;
      } else {
        //input is shorter or equal (loop over word list)
        loop = word.length;
      }

      for (let c = 0; c < loop; c++) {
        let correctedChar;
        try {
          correctedChar = correctedHistory[i][c];
        } catch (e) {
          correctedChar = undefined;
        }
        let extraCorrected = "";
        if (
          c + 1 === loop &&
          correctedHistory[i] !== undefined &&
          correctedHistory[i].length > input.length
        ) {
          extraCorrected = "extraCorrected";
        }
        if (Config.mode == "zen" || word[c] !== undefined) {
          if (Config.mode == "zen" || input[c] === word[c]) {
            if (correctedChar === input[c] || correctedChar === undefined) {
              wordEl += `<letter class="correct ${extraCorrected}">${input[c]}</letter>`;
            } else {
              wordEl +=
                `<letter class="corrected ${extraCorrected}">` +
                input[c] +
                "</letter>";
            }
          } else {
            if (input[c] === currentInput) {
              wordEl +=
                `<letter class='correct ${extraCorrected}'>` +
                word[c] +
                "</letter>";
            } else if (input[c] === undefined) {
              wordEl += "<letter>" + word[c] + "</letter>";
            } else {
              wordEl +=
                `<letter class="incorrect ${extraCorrected}">` +
                word[c] +
                "</letter>";
            }
          }
        } else {
          wordEl += '<letter class="incorrect extra">' + input[c] + "</letter>";
        }
      }
      wordEl += "</div>";
    } catch (e) {
      try {
        wordEl = "<div class='word'>";
        for (let c = 0; c < word.length; c++) {
          wordEl += "<letter>" + word[c] + "</letter>";
        }
        wordEl += "</div>";
      } catch {}
    }
    wordsHTML += wordEl;
  }
  $("#resultWordsHistory .words").html(wordsHTML);
  $("#showWordHistoryButton").addClass("loaded");
  return true;
}

function showEditTags(action, id, name) {
  if (action === "add") {
    $("#tagsWrapper #tagsEdit").attr("action", "add");
    $("#tagsWrapper #tagsEdit .title").html("Add new tag");
    $("#tagsWrapper #tagsEdit .button").html(`<i class="fas fa-plus"></i>`);
    $("#tagsWrapper #tagsEdit input").val("");
    $("#tagsWrapper #tagsEdit input").removeClass("hidden");
  } else if (action === "edit") {
    $("#tagsWrapper #tagsEdit").attr("action", "edit");
    $("#tagsWrapper #tagsEdit").attr("tagid", id);
    $("#tagsWrapper #tagsEdit .title").html("Edit tag name");
    $("#tagsWrapper #tagsEdit .button").html(`<i class="fas fa-pen"></i>`);
    $("#tagsWrapper #tagsEdit input").val(name);
    $("#tagsWrapper #tagsEdit input").removeClass("hidden");
  } else if (action === "remove") {
    $("#tagsWrapper #tagsEdit").attr("action", "remove");
    $("#tagsWrapper #tagsEdit").attr("tagid", id);
    $("#tagsWrapper #tagsEdit .title").html("Remove tag " + name);
    $("#tagsWrapper #tagsEdit .button").html(`<i class="fas fa-check"></i>`);
    $("#tagsWrapper #tagsEdit input").addClass("hidden");
  }

  if ($("#tagsWrapper").hasClass("hidden")) {
    $("#tagsWrapper")
      .stop(true, true)
      .css("opacity", 0)
      .removeClass("hidden")
      .animate({ opacity: 1 }, 100, () => {
        $("#tagsWrapper #tagsEdit input").focus();
      });
  }
}

function hideEditTags() {
  if (!$("#tagsWrapper").hasClass("hidden")) {
    $("#tagsWrapper #tagsEdit").attr("action", "");
    $("#tagsWrapper #tagsEdit").attr("tagid", "");
    $("#tagsWrapper")
      .stop(true, true)
      .css("opacity", 1)
      .animate(
        {
          opacity: 0,
        },
        100,
        () => {
          $("#tagsWrapper").addClass("hidden");
        }
      );
  }
}

$("#tagsWrapper").click((e) => {
  if ($(e.target).attr("id") === "tagsWrapper") {
    hideEditTags();
  }
});

$("#tagsWrapper #tagsEdit .button").click(() => {
  tagsEdit();
});

$("#tagsWrapper #tagsEdit input").keypress((e) => {
  if (e.keyCode == 13) {
    tagsEdit();
  }
});

function tagsEdit() {
  let action = $("#tagsWrapper #tagsEdit").attr("action");
  let inputVal = $("#tagsWrapper #tagsEdit input").val();
  let tagid = $("#tagsWrapper #tagsEdit").attr("tagid");
  hideEditTags();
  if (action === "add") {
    showBackgroundLoader();
    CloudFunctions.addTag({
      uid: firebase.auth().currentUser.uid,
      name: inputVal,
    }).then((e) => {
      hideBackgroundLoader();
      let status = e.data.resultCode;
      if (status === 1) {
        Notifications.add("Tag added", 1, 2);
        DB.getSnapshot().tags.push({
          name: inputVal,
          id: e.data.id,
        });
        updateResultEditTagsPanelButtons();
        updateSettingsPage();
        updateFilterTags();
      } else if (status === -1) {
        Notifications.add("Invalid tag name", 0);
      } else if (status < -1) {
        Notifications.add("Unknown error: " + e.data.message, -1);
      }
    });
  } else if (action === "edit") {
    showBackgroundLoader();
    CloudFunctions.editTag({
      uid: firebase.auth().currentUser.uid,
      name: inputVal,
      tagid: tagid,
    }).then((e) => {
      hideBackgroundLoader();
      let status = e.data.resultCode;
      if (status === 1) {
        Notifications.add("Tag updated", 1);
        DB.getSnapshot().tags.forEach((tag) => {
          if (tag.id === tagid) {
            tag.name = inputVal;
          }
        });
        updateResultEditTagsPanelButtons();
        updateSettingsPage();
        updateFilterTags();
      } else if (status === -1) {
        Notifications.add("Invalid tag name", 0);
      } else if (status < -1) {
        Notifications.add("Unknown error: " + e.data.message, -1);
      }
    });
  } else if (action === "remove") {
    showBackgroundLoader();
    CloudFunctions.removeTag({
      uid: firebase.auth().currentUser.uid,
      tagid: tagid,
    }).then((e) => {
      hideBackgroundLoader();
      let status = e.data.resultCode;
      if (status === 1) {
        Notifications.add("Tag removed", 1);
        DB.getSnapshot().tags.forEach((tag, index) => {
          if (tag.id === tagid) {
            DB.getSnapshot().tags.splice(index, 1);
          }
        });
        updateResultEditTagsPanelButtons();
        updateSettingsPage();
        updateFilterTags();
      } else if (status < -1) {
        Notifications.add("Unknown error: " + e.data.message, -1);
      }
    });
  }
}

function showCustomMode2Popup(mode) {
  if ($("#customMode2PopupWrapper").hasClass("hidden")) {
    if (mode == "time") {
      $("#customMode2Popup .title").text("Test length");
      $("#customMode2Popup").attr("mode", "time");
    } else if (mode == "words") {
      $("#customMode2Popup .title").text("Word amount");
      $("#customMode2Popup").attr("mode", "words");
    }
    $("#customMode2PopupWrapper")
      .stop(true, true)
      .css("opacity", 0)
      .removeClass("hidden")
      .animate({ opacity: 1 }, 100, (e) => {
        $("#customMode2Popup input").focus().select();
      });
  }
}

function hideCustomMode2Popup() {
  if (!$("#customMode2PopupWrapper").hasClass("hidden")) {
    $("#customMode2PopupWrapper")
      .stop(true, true)
      .css("opacity", 1)
      .animate(
        {
          opacity: 0,
        },
        100,
        (e) => {
          $("#customMode2PopupWrapper").addClass("hidden");
        }
      );
  }
}

async function showQuoteSearchPopup() {
  if ($("#quoteSearchPopupWrapper").hasClass("hidden")) {
    $("#quoteSearchPopup input").val("");
    $("#quoteSearchPopupWrapper")
      .stop(true, true)
      .css("opacity", 0)
      .removeClass("hidden")
      .animate({ opacity: 1 }, 100, (e) => {
        $("#quoteSearchPopup input").focus().select();
        updateQuoteSearchResults("");
      });
  }
}

async function updateQuoteSearchResults(searchText) {
  let quotes = await Misc.getQuotes(Config.language);
  let reg = new RegExp(searchText, "i");
  let found = [];
  quotes.quotes.forEach((quote) => {
    let quoteText = quote["text"].replace(/[.,'"/#!$%^&*;:{}=\-_`~()]/g, "");
    let test1 = reg.test(quoteText);
    if (test1) {
      found.push(quote);
    }
  });
  quotes.quotes.forEach((quote) => {
    let quoteSource = quote["source"].replace(
      /[.,'"/#!$%^&*;:{}=\-_`~()]/g,
      ""
    );
    let quoteId = quote["id"];
    let test2 = reg.test(quoteSource);
    let test3 = reg.test(quoteId);
    if ((test2 || test3) && found.filter((q) => q.id == quote.id).length == 0) {
      found.push(quote);
    }
  });
  $("#quoteSearchResults").remove();
  $("#quoteSearchPopup").append(
    '<div class="quoteSearchResults" id="quoteSearchResults"></div>'
  );
  let resultsList = $("#quoteSearchResults");
  let resultListLength = 0;

  found.forEach(async (quote) => {
    let lengthDesc;
    if (quote.length < 101) {
      lengthDesc = "short";
    } else if (quote.length < 301) {
      lengthDesc = "medium";
    } else if (quote.length < 601) {
      lengthDesc = "long";
    } else {
      lengthDesc = "thicc";
    }
    if (resultListLength++ < 100) {
      resultsList.append(`
      <div class="searchResult" id="${quote.id}">
        <div class="text">${quote.text}</div>
        <div class="id"><div class="sub">id</div>${quote.id}</div>
        <div class="length"><div class="sub">length</div>${lengthDesc}</div>
        <div class="source"><div class="sub">source</div>${quote.source}</div>
        <div class="resultChevron"><i class="fas fa-chevron-right"></i></div>
      </div>
      `);
    }
  });
  if (found.length > 100) {
    $("#extraResults").html(
      found.length +
        " results <span style='opacity: 0.5'>(only showing 100)</span>"
    );
  } else {
    $("#extraResults").html(found.length + " results");
  }
}

function hideQuoteSearchPopup() {
  if (!$("#quoteSearchPopupWrapper").hasClass("hidden")) {
    $("#quoteSearchPopupWrapper")
      .stop(true, true)
      .css("opacity", 1)
      .animate(
        {
          opacity: 0,
        },
        100,
        (e) => {
          $("#quoteSearchPopupWrapper").addClass("hidden");
        }
      );
  }
}

async function initPaceCaret() {
  let mode2 = "";
  if (Config.mode === "time") {
    mode2 = Config.time;
  } else if (Config.mode === "words") {
    mode2 = Config.words;
  } else if (Config.mode === "custom") {
    mode2 = "custom";
  } else if (Config.mode === "quote") {
    mode2 = randomQuote.id;
  }
  let wpm;
  if (Config.paceCaret === "pb") {
    wpm = await DB.getLocalPB(
      Config.mode,
      mode2,
      Config.punctuation,
      Config.language,
      Config.difficulty
    );
  } else if (Config.paceCaret === "average") {
    let mode2 = "";
    if (Config.mode === "time") {
      mode2 = Config.time;
    } else if (Config.mode === "words") {
      mode2 = Config.words;
    } else if (Config.mode === "custom") {
      mode2 = "custom";
    } else if (Config.mode === "quote") {
      mode2 = randomQuote.id;
    }
    wpm = await DB.getUserAverageWpm10(
      Config.mode,
      mode2,
      Config.punctuation,
      Config.language,
      Config.difficulty
    );
    console.log("avg pace " + wpm);
  } else if (Config.paceCaret === "custom") {
    wpm = Config.paceCaretCustomSpeed;
  }

  if (wpm < 1 || wpm == false || wpm == undefined || Number.isNaN(wpm)) {
    paceCaret = null;
    return;
  }

  let characters = wpm * 5;
  let cps = characters / 60; //characters per step
  let spc = 60 / characters; //seconds per character

  paceCaret = {
    wpm: wpm,
    cps: cps,
    spc: spc,
    correction: 0,
    currentWordIndex: 0,
    currentLetterIndex: -1,
    wordsStatus: {},
    timeout: null,
  };

  TestUI.updateModesNotice(sameWordset, textHasTab, paceCaret, activeFunbox);
}

function movePaceCaret(expectedStepEnd) {
  if (paceCaret === null || !testActive || TestUI.resultVisible) {
    return;
  }
  if ($("#paceCaret").hasClass("hidden")) {
    $("#paceCaret").removeClass("hidden");
  }
  if ($("#paceCaret").hasClass("off")) {
    return;
  }
  try {
    paceCaret.currentLetterIndex++;
    if (
      paceCaret.currentLetterIndex >=
      wordsList[paceCaret.currentWordIndex].length
    ) {
      //go to the next word
      paceCaret.currentLetterIndex = -1;
      paceCaret.currentWordIndex++;
    }
    if (!Config.blindMode) {
      if (paceCaret.correction < 0) {
        while (paceCaret.correction < 0) {
          paceCaret.currentLetterIndex--;
          if (paceCaret.currentLetterIndex <= -2) {
            //go to the previous word
            paceCaret.currentLetterIndex =
              wordsList[paceCaret.currentWordIndex - 1].length - 1;
            paceCaret.currentWordIndex--;
          }
          paceCaret.correction++;
        }
      } else if (paceCaret.correction > 0) {
        while (paceCaret.correction > 0) {
          paceCaret.currentLetterIndex++;
          if (
            paceCaret.currentLetterIndex >=
            wordsList[paceCaret.currentWordIndex].length
          ) {
            //go to the next word
            paceCaret.currentLetterIndex = -1;
            paceCaret.currentWordIndex++;
          }
          paceCaret.correction--;
        }
      }
    }
  } catch (e) {
    //out of words
    paceCaret = null;
    $("#paceCaret").addClass("hidden");
    return;
  }

  try {
    let caret = $("#paceCaret");
    let currentLetter;
    let newTop;
    let newLeft;
    try {
      let newIndex =
        paceCaret.currentWordIndex -
        (currentWordIndex - TestUI.currentWordElementIndex);
      if (paceCaret.currentLetterIndex === -1) {
        currentLetter = document
          .querySelectorAll("#words .word")
          [newIndex].querySelectorAll("letter")[0];
      } else {
        currentLetter = document
          .querySelectorAll("#words .word")
          [newIndex].querySelectorAll("letter")[paceCaret.currentLetterIndex];
      }
      newTop = currentLetter.offsetTop - $(currentLetter).height() / 20;
      newLeft;
      if (paceCaret.currentLetterIndex === -1) {
        newLeft = currentLetter.offsetLeft;
      } else {
        newLeft =
          currentLetter.offsetLeft +
          $(currentLetter).width() -
          caret.width() / 2;
      }
      caret.removeClass("hidden");
    } catch (e) {
      caret.addClass("hidden");
    }

    let smoothlinescroll = $("#words .smoothScroller").height();
    if (smoothlinescroll === undefined) smoothlinescroll = 0;

    $("#paceCaret").css({
      top: newTop - smoothlinescroll,
    });

    let duration = expectedStepEnd - performance.now();

    if (Config.smoothCaret) {
      caret.stop(true, true).animate(
        {
          left: newLeft,
        },
        duration,
        "linear"
      );
    } else {
      caret.stop(true, true).animate(
        {
          left: newLeft,
        },
        0,
        "linear"
      );
    }
    paceCaret.timeout = setTimeout(() => {
      try {
        movePaceCaret(expectedStepEnd + paceCaret.spc * 1000);
      } catch (e) {
        paceCaret = null;
      }
    }, duration);
  } catch (e) {
    console.error(e);
    $("#paceCaret").addClass("hidden");
  }
}

function resetPaceCaret() {
  if (Config.paceCaret === "off") return;
  if (!$("#paceCaret").hasClass("hidden")) {
    $("#paceCaret").addClass("hidden");
  }
  if (Config.mode === "zen") return;

  let caret = $("#paceCaret");
  let firstLetter = document
    .querySelector("#words .word")
    .querySelector("letter");

  caret.stop(true, true).animate(
    {
      top: firstLetter.offsetTop - $(firstLetter).height() / 4,
      left: firstLetter.offsetLeft,
    },
    0,
    "linear"
  );
}

$("#customMode2PopupWrapper").click((e) => {
  if ($(e.target).attr("id") === "customMode2PopupWrapper") {
    hideCustomMode2Popup();
  }
});

$("#customMode2Popup input").keypress((e) => {
  if (e.keyCode == 13) {
    applyMode2Popup();
  }
});
//Quote search
$("#quoteSearchPopup .searchBox").keydown((e) => {
  setTimeout(() => {
    let searchText = document.getElementById("searchBox").value;
    searchText = searchText
      .replace(/[.,'"/#!$%^&*;:{}=\-_`~()]/g, "")
      .replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

    updateQuoteSearchResults(searchText);
  }, 0.1); //arbitrarily v. small time as it's only to allow text to input before searching
});
//sets quote id to searched quote clicked
$("#quoteSearchResults").click((e) => {
  if ($(e.target).hasClass("quoteSearchButton")) {
    document.getElementById("inputNumber").value = e.target.getAttribute("id");
    applyMode2Popup();
  }
});

$("#quoteSearchPopupWrapper").click((e) => {
  if ($(e.target).attr("id") === "quoteSearchPopupWrapper") {
    hideQuoteSearchPopup();
  }
});

$("#customMode2Popup .button").click(() => {
  applyMode2Popup();
});

$(document).on("click", "#quoteSearchResults .searchResult", (e) => {
  selectedQuoteId = parseInt($(e.currentTarget).attr("id"));
  applyQuoteSearchPopup(selectedQuoteId);
});

$("#quoteSearchPopup input").keypress((e) => {
  if (e.keyCode == 13) {
    if (!isNaN(document.getElementById("searchBox").value)) {
      applyQuoteSearchPopup();
    } else {
      let results = document.getElementsByClassName("searchResult");
      if (results.length > 0) {
        selectedQuoteId = parseInt(results[0].getAttribute("id"));
        applyQuoteSearchPopup(selectedQuoteId);
      }
    }
  }
});

function applyMode2Popup() {
  let mode = $("#customMode2Popup").attr("mode");
  let val = parseInt($("#customMode2Popup input").val());

  if (mode == "time") {
    if (val !== null && !isNaN(val) && val >= 0) {
      setTimeConfig(val);
      ManualRestart.set();
      restartTest();
      if (val >= 1800) {
        Notifications.add("Stay safe and take breaks!", 0);
      } else if (val == 0) {
        Notifications.add(
          "Infinite time! Make sure to use Bail Out from the command line to save your result.",
          0,
          7
        );
      }
    } else {
      Notifications.add("Custom time must be at least 1", 0);
    }
  } else if (mode == "words") {
    if (val !== null && !isNaN(val) && val >= 0) {
      setWordCount(val);
      ManualRestart.set();
      restartTest();
      if (val > 2000) {
        Notifications.add("Stay safe and take breaks!", 0);
      } else if (val == 0) {
        Notifications.add(
          "Infinite words! Make sure to use Bail Out from the command line to save your result.",
          0,
          7
        );
      }
    } else {
      Notifications.add("Custom word amount must be at least 1", 0);
    }
  }

  hideCustomMode2Popup();
}

function applyQuoteSearchPopup(val) {
  if (isNaN(val)) {
    val = document.getElementById("searchBox").value;
  }
  if (val !== null && !isNaN(val) && val >= 0) {
    setQuoteLength(-2, false, false);
    selectedQuoteId = val;
    ManualRestart.set();
    restartTest();
  } else {
    Notifications.add("Quote ID must be at least 1", 0);
  }
  hideQuoteSearchPopup();
}

$(document).on("click", "#top .logo", (e) => {
  changePage("test");
});

$(document).on("click", "#top .config .wordCount .text-button", (e) => {
  const wrd = $(e.currentTarget).attr("wordCount");
  if (wrd == "custom") {
    showCustomMode2Popup("words");
  } else {
    setWordCount(wrd);
    ManualRestart.set();
    restartTest();
  }
});

$(document).on("click", "#top .config .time .text-button", (e) => {
  let mode = $(e.currentTarget).attr("timeConfig");
  if (mode == "custom") {
    showCustomMode2Popup("time");
  } else {
    setTimeConfig(mode);
    ManualRestart.set();

    restartTest();
  }
});

$(document).on("click", "#top .config .quoteLength .text-button", (e) => {
  let len = $(e.currentTarget).attr("quoteLength");
  if (len == -2) {
    showQuoteSearchPopup();
    setQuoteLength(len, false, e.shiftKey);
  } else {
    if (len == -1) {
      len = [0, 1, 2, 3];
    }
    setQuoteLength(len, false, e.shiftKey);
    ManualRestart.set();
    restartTest();
  }
});

$(document).on("click", "#top .config .customText .text-button", () => {
  CustomTextPopup.show(restartTest);
});

$(document).on("click", "#top .config .punctuationMode .text-button", () => {
  togglePunctuation();
  ManualRestart.set();

  restartTest();
});

$(document).on("click", "#top .config .numbersMode .text-button", () => {
  toggleNumbers();
  ManualRestart.set();

  restartTest();
});

$("#wordsWrapper").on("click", () => {
  focusWords();
});

$(document).on("click", "#top .config .mode .text-button", (e) => {
  if ($(e.currentTarget).hasClass("active")) return;
  const mode = $(e.currentTarget).attr("mode");
  setMode(mode);
  ManualRestart.set();
  restartTest();
});

$(document).on("click", "#top #menu .icon-button", (e) => {
  if ($(e.currentTarget).hasClass("discord")) return;
  if ($(e.currentTarget).hasClass("leaderboards")) {
    Leaderboards.show();
  } else {
    const href = $(e.currentTarget).attr("href");
    ManualRestart.set();
    changePage(href.replace("/", ""));
  }
});

$(window).on("popstate", (e) => {
  let state = e.originalEvent.state;
  if (state == "" || state == "/") {
    // show test
    changePage("test");
  } else if (state == "about") {
    // show about
    changePage("about");
  } else if (state == "account" || state == "login") {
    if (firebase.auth().currentUser) {
      changePage("account");
    } else {
      changePage("login");
    }
  }
});

$(document).on("keypress", "#restartTestButton", (event) => {
  if (event.keyCode == 13) {
    if (
      testActive &&
      Config.repeatQuotes === "typing" &&
      Config.mode === "quote"
    ) {
      restartTest(true);
    } else {
      restartTest();
    }
  }
});

$(document.body).on("click", "#restartTestButton", () => {
  ManualRestart.set();
  if (TestUI.resultCalculating) return;
  if (
    testActive &&
    Config.repeatQuotes === "typing" &&
    Config.mode === "quote"
  ) {
    restartTest(true);
  } else {
    restartTest();
  }
});

$(document).on("keypress", "#practiseMissedWordsButton", (event) => {
  if (event.keyCode == 13) {
    PractiseMissed.init(setMode, restartTest);
  }
});

$(document.body).on("click", "#practiseMissedWordsButton", () => {
  PractiseMissed.init(setMode, restartTest);
});

$(document).on("keypress", "#nextTestButton", (event) => {
  if (event.keyCode == 13) {
    restartTest();
  }
});

$(document.body).on("click", "#nextTestButton", () => {
  ManualRestart.set();
  restartTest();
});

$(document).on("keypress", "#showWordHistoryButton", (event) => {
  if (event.keyCode == 13) {
    toggleResultWordsDisplay();
  }
});

$(document.body).on("click", "#showWordHistoryButton", () => {
  toggleResultWordsDisplay();
});

$(document.body).on("click", "#restartTestButtonWithSameWordset", () => {
  if (Config.mode == "zen") {
    Notifications.add("Repeat test disabled in zen mode");
    return;
  }
  ManualRestart.set();
  restartTest(true);
});

$(document).on("keypress", "#restartTestButtonWithSameWordset", (event) => {
  if (Config.mode == "zen") {
    Notifications.add("Repeat test disabled in zen mode");
    return;
  }
  if (event.keyCode == 13) {
    restartTest(true);
  }
});

$(document.body).on("click", ".version", () => {
  $("#versionHistoryWrapper")
    .css("opacity", 0)
    .removeClass("hidden")
    .animate({ opacity: 1 }, 125);
});

$(document.body).on("click", "#versionHistoryWrapper", () => {
  $("#versionHistoryWrapper")
    .css("opacity", 1)
    .animate({ opacity: 0 }, 125, () => {
      $("#versionHistoryWrapper").addClass("hidden");
    });
});

$(document.body).on("click", "#supportMeButton", () => {
  $("#supportMeWrapper")
    .css("opacity", 0)
    .removeClass("hidden")
    .animate({ opacity: 1 }, 125);
});

$(document.body).on("click", "#supportMeWrapper", () => {
  $("#supportMeWrapper")
    .css("opacity", 1)
    .animate({ opacity: 0 }, 125, () => {
      $("#supportMeWrapper").addClass("hidden");
    });
});

$(document.body).on("click", "#supportMeWrapper .button.ads", () => {
  currentCommands.push(commandsEnableAds);
  showCommandLine();
  $("#supportMeWrapper")
    .css("opacity", 1)
    .animate({ opacity: 0 }, 125, () => {
      $("#supportMeWrapper").addClass("hidden");
    });
});

$(document.body).on("click", "#supportMeWrapper a.button", () => {
  $("#supportMeWrapper")
    .css("opacity", 1)
    .animate({ opacity: 0 }, 125, () => {
      $("#supportMeWrapper").addClass("hidden");
    });
});

$(document.body).on("click", ".pageAbout .aboutEnableAds", () => {
  currentCommands.push(commandsEnableAds);
  showCommandLine();
});

$("#wordsInput").keypress((event) => {
  event.preventDefault();
});

$("#wordsInput").on("focus", () => {
  if (!TestUI.resultVisible && Config.showOutOfFocusWarning) {
    OutOfFocus.hide();
  }
  Caret.show(currentInput);
});

$("#wordsInput").on("focusout", () => {
  if (!TestUI.resultVisible && Config.showOutOfFocusWarning) {
    OutOfFocus.show();
  }
  Caret.hide();
});

$(window).resize(() => {
  Caret.updatePosition(currentInput);
});

$(document).mousemove(function (event) {
  if (
    $("#top").hasClass("focus") &&
    (event.originalEvent.movementX > 0 || event.originalEvent.movementY > 0)
  ) {
    Focus.set(false);
  }
});

$(document).on("click", "#testModesNotice .text-button", (event) => {
  let commands = eval($(event.currentTarget).attr("commands"));
  let func = $(event.currentTarget).attr("function");
  if (commands !== undefined) {
    if ($(event.currentTarget).attr("commands") === "commandsTags") {
      updateCommandsTagsList();
    }
    currentCommands.push(commands);
    showCommandLine();
  } else if (func != undefined) {
    eval(func);
  }
});

$(document).on("click", "#commandLineMobileButton", () => {
  currentCommands = [commands];
  showCommandLine();
});

let dontInsertSpace = false;

$(document).keyup((event) => {
  if (!event.originalEvent.isTrusted) return;

  if (TestUI.resultVisible) return;
  let now = performance.now();
  let diff = Math.abs(TestStats.keypressTimings.duration.current - now);
  if (TestStats.keypressTimings.duration.current !== -1) {
    TestStats.pushKeypressDuration(diff);
    // keypressStats.duration.array.push(diff);
  }
  TestStats.setKeypressDuration(now);
  // keypressStats.duration.current = now;
  Monkey.stop();
});

$(document).keydown(function (event) {
  if (!(event.key == " ") && !event.originalEvent.isTrusted) return;

  if (!TestUI.resultVisible) {
    TestStats.recordKeypressSpacing();
  }

  Monkey.type();

  //autofocus
  let pageTestActive = !$(".pageTest").hasClass("hidden");
  let commandLineVisible = !$("#commandLineWrapper").hasClass("hidden");
  let wordsFocused = $("#wordsInput").is(":focus");
  let modePopupVisible =
    !$("#customTextPopupWrapper").hasClass("hidden") ||
    !$("#customMode2PopupWrapper").hasClass("hidden") ||
    !$("#quoteSearchPopupWrapper").hasClass("hidden");
  if (
    pageTestActive &&
    !commandLineVisible &&
    !modePopupVisible &&
    !TestUI.resultVisible &&
    !wordsFocused &&
    event.key !== "Enter"
  ) {
    focusWords();
    wordsFocused = true;
    // if (Config.showOutOfFocusWarning) return;
  }

  //tab
  if (
    (event.key == "Tab" && !Config.swapEscAndTab) ||
    (event.key == "Escape" && Config.swapEscAndTab)
  ) {
    handleTab(event);
    // event.preventDefault();
  }

  //blocking firefox from going back in history with backspace
  if (event.key === "Backspace" && wordsFocused) {
    let t = /INPUT|SELECT|TEXTAREA/i;
    if (
      !t.test(event.target.tagName) ||
      event.target.disabled ||
      event.target.readOnly
    ) {
      event.preventDefault();
    }
  }

  // keypressStats.duration.current = performance.now();
  TestStats.setKeypressDuration(performance.now());

  if (TestUI.testRestarting) {
    return;
  }

  //backspace
  const isBackspace =
    event.key === "Backspace" ||
    (Config.capsLockBackspace && event.key === "CapsLock");
  if (isBackspace && wordsFocused) {
    handleBackspace(event);
  }

  if (
    event.key === "Enter" &&
    activeFunbox.activeFunbox === "58008" &&
    wordsFocused
  ) {
    event.key = " ";
  }

  //space or enter
  if (event.key === " " && wordsFocused) {
    handleSpace(event, false);
  }

  if (wordsFocused && !commandLineVisible) {
    handleAlpha(event);
  }

  let acc = Misc.roundTo2(TestStats.calculateAccuracy());
  LiveAcc.update(acc);
});

function handleTab(event) {
  if (TestUI.resultCalculating) {
    event.preventDefault();
  }
  if ($("#customTextPopup .textarea").is(":focus")) {
    event.preventDefault();

    let area = $("#customTextPopup .textarea")[0];

    var start = area.selectionStart;
    var end = area.selectionEnd;

    // set textarea value to: text before caret + tab + text after caret
    area.value =
      area.value.substring(0, start) + "\t" + area.value.substring(end);

    // put caret at right position again
    area.selectionStart = area.selectionEnd = start + 1;

    // event.preventDefault();
    // $("#customTextPopup .textarea").val(
    //   $("#customTextPopup .textarea").val() + "\t"
    // );
    return;
  } else if (
    $(".pageTest").hasClass("active") &&
    !TestUI.resultCalculating &&
    $("#commandLineWrapper").hasClass("hidden") &&
    $("#simplePopupWrapper").hasClass("hidden")
  ) {
    if (Config.quickTab) {
      if (Config.mode == "zen" && !event.shiftKey) {
        //ignore
      } else {
        if (event.shiftKey) ManualRestart.set();

        if (
          testActive &&
          Config.repeatQuotes === "typing" &&
          Config.mode === "quote"
        ) {
          restartTest(true, false, event);
        } else {
          restartTest(false, false, event);
        }
      }
    } else {
      if (
        !TestUI.resultVisible &&
        ((textHasTab && event.shiftKey) ||
          (!textHasTab && Config.mode !== "zen") ||
          (Config.mode === "zen" && event.shiftKey))
      ) {
        event.preventDefault();
        $("#restartTestButton").focus();
      }
    }
  } else if (Config.quickTab) {
    changePage("test");
  }

  // } else if (
  //   !event.ctrlKey &&
  //   (
  //     (!event.shiftKey && !textHasTab) ||
  //     (event.shiftKey && textHasTab) ||
  //     TestUI.resultVisible
  //   ) &&
  //   Config.quickTab &&
  //   !$(".pageLogin").hasClass("active") &&
  //   !resultCalculating &&
  //   $("#commandLineWrapper").hasClass("hidden") &&
  //   $("#simplePopupWrapper").hasClass("hidden")
  // ) {
  //   event.preventDefault();
  //   if ($(".pageTest").hasClass("active")) {
  //     if (
  //       (Config.mode === "words" && Config.words < 1000) ||
  //       (Config.mode === "time" && Config.time < 3600) ||
  //       Config.mode === "quote" ||
  //       (Config.mode === "custom" &&
  //         CustomText.isWordRandom &&
  //         CustomText.word < 1000) ||
  //       (Config.mode === "custom" &&
  //         CustomText.isTimeRandom &&
  //         CustomText.time < 3600) ||
  //       (Config.mode === "custom" &&
  //         !CustomText.isWordRandom &&
  //         CustomText.text.length < 1000)
  //     ) {
  //       if (testActive) {
  //         let testNow = performance.now();
  //         let testSeconds = Misc.roundTo2((testNow - testStart) / 1000);
  //         let afkseconds = keypressPerSecond.filter(
  //           (x) => x.count == 0 && x.mod == 0
  //         ).length;
  //         incompleteTestSeconds += testSeconds - afkseconds;
  //         restartCount++;
  //       }
  //       restartTest();
  //     } else {
  //       Notifications.add("Quick restart disabled for long tests", 0);
  //     }
  //   } else {
  //     changePage("test");
  //   }
  // } else if (
  //   !Config.quickTab &&
  //   textHasTab &&
  //   event.shiftKey &&
  //   !TestUI.resultVisible
  // ) {
  //   event.preventDefault();
  //   $("#restartTestButton").focus();
  // }
}

function handleBackspace(event) {
  event.preventDefault();
  if (!testActive) return;
  if (
    currentInput == "" &&
    inputHistory.length > 0 &&
    TestUI.currentWordElementIndex > 0
  ) {
    //if nothing is inputted and its not the first word
    if (
      (inputHistory[currentWordIndex - 1] == wordsList[currentWordIndex - 1] &&
        !Config.freedomMode) ||
      $($(".word")[currentWordIndex - 1]).hasClass("hidden")
    ) {
      return;
    } else {
      if (Config.confidenceMode === "on" || Config.confidenceMode === "max")
        return;
      if (event["ctrlKey"] || event["altKey"]) {
        currentInput = "";
        inputHistory.pop();
        correctedHistory.pop();
      } else {
        currentInput = inputHistory.pop();
        currentCorrected = correctedHistory.pop();
        if (activeFunbox === "nospace") {
          currentInput = currentInput.substring(0, currentInput.length - 1);
        }
      }
      currentWordIndex--;
      TestUI.setCurrentWordElementIndex(TestUI.currentWordElementIndex - 1);
      TestUI.updateActiveElement(true);
      toggleScriptFunbox(wordsList[currentWordIndex]);
      updateWordElement(!Config.blindMode);
    }
  } else {
    if (Config.confidenceMode === "max") return;
    if (event["ctrlKey"] || event["altKey"]) {
      let limiter = " ";
      if (currentInput.lastIndexOf("-") > currentInput.lastIndexOf(" "))
        limiter = "-";

      let split = currentInput.replace(/ +/g, " ").split(limiter);
      if (split[split.length - 1] == "") {
        split.pop();
      }
      let addlimiter = false;
      if (split.length > 1) {
        addlimiter = true;
      }
      split.pop();
      currentInput = split.join(limiter);

      if (addlimiter) {
        currentInput += limiter;
      }
    } else if (event.metaKey) {
      currentInput = "";
    } else {
      currentInput = currentInput.substring(0, currentInput.length - 1);
    }
    updateWordElement(!Config.blindMode);
  }
  Sound.playClick(Config.playSoundOnClick);
  if (Config.keymapMode === "react") {
    Keymap.flashKey(event.code, true);
  } else if (Config.keymapMode === "next") {
    Keymap.highlightKey(
      wordsList[currentWordIndex]
        .substring(currentInput.length, currentInput.length + 1)
        .toString()
        .toUpperCase()
    );
  }
  Caret.updatePosition(currentInput);
}

function handleSpace(event, isEnter) {
  if (!testActive) return;
  if (currentInput === "") return;
  // let nextWord = wordsList[currentWordIndex + 1];
  // if ((isEnter && nextWord !== "\n") && (isEnter && activeFunbox !== "58008")) return;
  // if (!isEnter && nextWord === "\n") return;
  event.preventDefault();

  if (Config.mode == "zen") {
    $("#words .word.active").removeClass("active");
    $("#words").append("<div class='word active'></div>");
  }

  let currentWord = wordsList[currentWordIndex];
  if (activeFunbox === "layoutfluid" && Config.mode !== "time") {
    const layouts = ["qwerty", "dvorak", "colemak"];
    let index = 0;
    let outof = wordsList.length;
    index = Math.floor((inputHistory.length + 1) / (outof / 3));
    if (Config.layout !== layouts[index] && layouts[index] !== undefined) {
      Notifications.add(`--- !!! ${layouts[index]} !!! ---`, 0);
    }
    setLayout(layouts[index]);
    setKeymapLayout(layouts[index]);
    Keymap.highlightKey(
      wordsList[currentWordIndex]
        .substring(currentInput.length, currentInput.length + 1)
        .toString()
        .toUpperCase()
    );
    settingsGroups.layout.updateButton();
  }
  dontInsertSpace = true;
  if (currentWord == currentInput || Config.mode == "zen") {
    //correct word or in zen mode
    if (
      paceCaret !== null &&
      paceCaret.wordsStatus[currentWordIndex] === true &&
      !Config.blindMode
    ) {
      paceCaret.wordsStatus[currentWordIndex] = undefined;
      paceCaret.correction -= currentWord.length + 1;
    }
    TestStats.incrementAccuracy(true);
    inputHistory.push(currentInput);
    currentInput = "";
    currentWordIndex++;
    TestUI.setCurrentWordElementIndex(TestUI.currentWordElementIndex + 1);
    TestUI.updateActiveElement();
    toggleScriptFunbox(wordsList[currentWordIndex]);
    Caret.updatePosition(currentInput);
    TestStats.incrementKeypressCount();
    TestStats.pushKeypressWord(currentWordIndex);
    // currentKeypress.count++;
    // currentKeypress.words.push(currentWordIndex);
    if (activeFunbox !== "nospace") {
      Sound.playClick(Config.playSoundOnClick);
    }
  } else {
    //incorrect word
    if (
      paceCaret !== null &&
      paceCaret.wordsStatus[currentWordIndex] === undefined &&
      !Config.blindMode
    ) {
      paceCaret.wordsStatus[currentWordIndex] = true;
      paceCaret.correction += currentWord.length + 1;
    }
    if (activeFunbox !== "nospace") {
      if (!Config.playSoundOnError || Config.blindMode) {
        Sound.playClick(Config.playSoundOnClick);
      } else {
        Sound.playError(Config.playSoundOnError);
      }
    }
    TestStats.incrementAccuracy(false);
    TestStats.incrementKeypressErrors();
    let cil = currentInput.length;
    if (cil <= wordsList[currentWordIndex].length) {
      if (cil >= currentCorrected.length) {
        currentCorrected += "_";
      } else {
        currentCorrected =
          currentCorrected.substring(0, cil) +
          "_" +
          currentCorrected.substring(cil + 1);
      }
    }
    if (Config.stopOnError != "off") {
      if (Config.difficulty == "expert" || Config.difficulty == "master") {
        //failed due to diff when pressing space
        failTest();
        return;
      }
      if (Config.stopOnError == "word") {
        currentInput += " ";
        updateWordElement(true);
        Caret.updatePosition(currentInput);
      }
      return;
    }
    if (Config.blindMode) $("#words .word.active letter").addClass("correct");
    inputHistory.push(currentInput);
    highlightBadWord(TestUI.currentWordElementIndex, !Config.blindMode);
    currentInput = "";
    currentWordIndex++;
    TestUI.setCurrentWordElementIndex(TestUI.currentWordElementIndex + 1);
    TestUI.updateActiveElement();
    toggleScriptFunbox(wordsList[currentWordIndex]);
    Caret.updatePosition(currentInput);
    // currentKeypress.count++;
    // currentKeypress.words.push(currentWordIndex);
    TestStats.incrementKeypressCount();
    TestStats.pushKeypressWord(currentWordIndex);
    if (Config.difficulty == "expert" || Config.difficulty == "master") {
      failTest();
      return;
    } else if (currentWordIndex == wordsList.length) {
      //submitted last word that is incorrect
      TestStats.setLastSecondNotRound();
      showResult();
      return;
    }
  }

  correctedHistory.push(currentCorrected);
  currentCorrected = "";

  if (
    !Config.showAllLines ||
    Config.mode == "time" ||
    (CustomText.isWordRandom && CustomText.word == 0) ||
    CustomText.isTimeRandom
  ) {
    let currentTop = Math.floor(
      document.querySelectorAll("#words .word")[
        TestUI.currentWordElementIndex - 1
      ].offsetTop
    );
    let nextTop;
    try {
      nextTop = Math.floor(
        document.querySelectorAll("#words .word")[
          TestUI.currentWordElementIndex
        ].offsetTop
      );
    } catch (e) {
      nextTop = 0;
    }

    if (nextTop > currentTop && !TestUI.lineTransition) {
      TestUI.lineJump(currentTop);
    }
  } //end of line wrap

  Caret.updatePosition(currentInput);

  if (Config.keymapMode === "react") {
    Keymap.flashKey(event.code, true);
  } else if (Config.keymapMode === "next") {
    Keymap.highlightKey(
      wordsList[currentWordIndex]
        .substring(currentInput.length, currentInput.length + 1)
        .toString()
        .toUpperCase()
    );
  }
  if (
    Config.mode === "words" ||
    Config.mode === "custom" ||
    Config.mode === "quote" ||
    Config.mode === "zen"
  ) {
    updateTimer();
  }
  if (
    Config.mode == "time" ||
    Config.mode == "words" ||
    Config.mode == "custom"
  ) {
    addWord();
  }
}

function handleAlpha(event) {
  if (
    [
      "ContextMenu",
      "Escape",
      "Shift",
      "Control",
      "Meta",
      "Alt",
      "AltGraph",
      "CapsLock",
      "Backspace",
      "PageUp",
      "PageDown",
      "Home",
      "ArrowUp",
      "ArrowLeft",
      "ArrowRight",
      "ArrowDown",
      "OS",
      "Insert",
      "Home",
      "Undefined",
      "Control",
      "Fn",
      "FnLock",
      "Hyper",
      "NumLock",
      "ScrollLock",
      "Symbol",
      "SymbolLock",
      "Super",
      "Unidentified",
      "Process",
      "Delete",
      "KanjiMode",
      "Pause",
      "PrintScreen",
      "Clear",
      "End",
      undefined,
    ].includes(event.key)
  ) {
    TestStats.incrementKeypressMod();
    // currentKeypress.mod++;
    return;
  }

  //insert space for expert and master or strict space,
  //otherwise dont do anything
  if (event.key === " ") {
    if (Config.difficulty !== "normal" || Config.strictSpace) {
      if (dontInsertSpace) {
        dontInsertSpace = false;
        return;
      }
    } else {
      return;
    }
  }

  if (event.key === "Tab") {
    if (
      Config.mode !== "zen" &&
      (!textHasTab || (textHasTab && event.shiftKey))
    ) {
      return;
    }
    event.key = "\t";
    event.preventDefault();
  }

  if (event.key === "Enter") {
    if (event.shiftKey && Config.mode == "zen") {
      showResult();
    }
    if (
      event.shiftKey &&
      ((Config.mode == "time" && Config.time === 0) ||
        (Config.mode == "words" && Config.words === 0))
    ) {
      bailout = true;
      showResult();
    }
    event.key = "\n";
  }

  // if (event.key.length > 1) return;
  if (/F\d+/.test(event.key)) return;
  if (/Numpad/.test(event.key)) return;
  if (/Volume/.test(event.key)) return;
  if (/Media/.test(event.key)) return;
  if (
    event.ctrlKey != event.altKey &&
    (event.ctrlKey || /Linux/.test(window.navigator.platform))
  )
    return;
  if (event.metaKey) return;

  let originalEvent = event;

  event = emulateLayout(event);

  //start the test
  if (currentInput == "" && inputHistory.length == 0 && !testActive) {
    if (!startTest()) return;
  } else {
    if (!testActive) return;
  }

  Focus.set(true);
  Caret.stopAnimation();

  //show dead keys
  if (event.key === "Dead") {
    Sound.playClick(Config.playSoundOnClick);
    $(
      document.querySelector("#words .word.active").querySelectorAll("letter")[
        currentInput.length
      ]
    ).toggleClass("dead");
    return;
  }

  //check if the char typed was correct
  let thisCharCorrect;
  let nextCharInWord;
  if (Config.mode != "zen") {
    nextCharInWord = wordsList[currentWordIndex].substring(
      currentInput.length,
      currentInput.length + 1
    );
  }

  if (nextCharInWord == event["key"]) {
    thisCharCorrect = true;
  } else {
    thisCharCorrect = false;
  }

  if (Config.language.split("_")[0] == "russian") {
    if ((event.key === "е" || event.key === "e") && nextCharInWord == "ё") {
      event.key = nextCharInWord;
      thisCharCorrect = true;
    }
    if (
      event.key === "ё" &&
      (nextCharInWord == "е" || nextCharInWord === "e")
    ) {
      event.key = nextCharInWord;
      thisCharCorrect = true;
    }
  }

  if (Config.mode == "zen") {
    thisCharCorrect = true;
  }

  if (event.key === "’" && nextCharInWord == "'") {
    event.key = "'";
    thisCharCorrect = true;
  }

  if (event.key === "'" && nextCharInWord == "’") {
    event.key = "’";
    thisCharCorrect = true;
  }

  if (event.key === "”" && nextCharInWord == '"') {
    event.key = '"';
    thisCharCorrect = true;
  }

  if (event.key === '"' && nextCharInWord == "”") {
    event.key = "”";
    thisCharCorrect = true;
  }

  if ((event.key === "–" || event.key === "—") && nextCharInWord == "-") {
    event.key = "-";
    thisCharCorrect = true;
  }

  if (
    Config.oppositeShiftMode === "on" &&
    ShiftTracker.isUsingOppositeShift(originalEvent) === false
  ) {
    thisCharCorrect = false;
  }

  if (!thisCharCorrect) {
    TestStats.incrementAccuracy(false);
    TestStats.incrementKeypressErrors();
    // currentError.count++;
    // currentError.words.push(currentWordIndex);
    thisCharCorrect = false;
    TestStats.pushMissedWord(wordsList[currentWordIndex]);
  } else {
    TestStats.incrementAccuracy(true);
    thisCharCorrect = true;
    if (Config.mode == "zen") {
      //making the input visible to the user
      $("#words .active").append(
        `<letter class="correct">${event.key}</letter>`
      );
    }
  }

  if (thisCharCorrect) {
    Sound.playClick(Config.playSoundOnClick);
  } else {
    if (!Config.playSoundOnError || Config.blindMode) {
      Sound.playClick(Config.playSoundOnClick);
    } else {
      Sound.playError(Config.playSoundOnError);
    }
  }

  if (
    Config.oppositeShiftMode === "on" &&
    ShiftTracker.isUsingOppositeShift(originalEvent) === false
  )
    return;

  //update current corrected verison. if its empty then add the current key. if its not then replace the last character with the currently pressed one / add it
  if (currentCorrected === "") {
    currentCorrected = currentInput + event["key"];
  } else {
    let cil = currentInput.length;
    if (cil >= currentCorrected.length) {
      currentCorrected += event["key"];
    } else if (!thisCharCorrect) {
      currentCorrected =
        currentCorrected.substring(0, cil) +
        event["key"] +
        currentCorrected.substring(cil + 1);
    }
  }
  TestStats.incrementKeypressCount();
  TestStats.pushKeypressWord(currentWordIndex);
  // currentKeypress.count++;
  // currentKeypress.words.push(currentWordIndex);

  if (Config.stopOnError == "letter" && !thisCharCorrect) {
    return;
  }

  //update the active word top, but only once
  if (currentInput.length === 1 && currentWordIndex === 0) {
    TestUI.setActiveWordTop(document.querySelector("#words .active").offsetTop);
  }

  //max length of the input is 20 unless in zen mode
  if (
    Config.mode == "zen" ||
    currentInput.length < wordsList[currentWordIndex].length + 20
  ) {
    currentInput += event["key"];
  }

  if (!thisCharCorrect && Config.difficulty == "master") {
    failTest();
    return;
  }

  //keymap
  if (Config.keymapMode === "react") {
    Keymap.flashKey(event.key, thisCharCorrect);
  } else if (Config.keymapMode === "next") {
    Keymap.highlightKey(
      wordsList[currentWordIndex]
        .substring(currentInput.length, currentInput.length + 1)
        .toString()
        .toUpperCase()
    );
  }

  let activeWordTopBeforeJump = TestUI.activeWordTop;
  updateWordElement(!Config.blindMode);

  if (Config.mode != "zen") {
    //not applicable to zen mode
    //auto stop the test if the last word is correct
    let currentWord = wordsList[currentWordIndex];
    let lastindex = currentWordIndex;
    if (
      (currentWord == currentInput ||
        (Config.quickEnd &&
          currentWord.length == currentInput.length &&
          Config.stopOnError == "off")) &&
      lastindex == wordsList.length - 1
    ) {
      inputHistory.push(currentInput);
      currentInput = "";
      correctedHistory.push(currentCorrected);
      currentCorrected = "";
      TestStats.setLastSecondNotRound();
      showResult();
    }
  }

  //simulate space press in nospace funbox
  if (
    (activeFunbox === "nospace" &&
      currentInput.length === wordsList[currentWordIndex].length) ||
    (event.key === "\n" && thisCharCorrect)
  ) {
    $.event.trigger({
      type: "keydown",
      which: " ".charCodeAt(0),
      key: " ",
    });
  }

  let newActiveTop = document.querySelector("#words .word.active").offsetTop;
  //stop the word jump by slicing off the last character, update word again
  if (
    activeWordTopBeforeJump < newActiveTop &&
    !TestUI.lineTransition &&
    currentInput.length > 1
  ) {
    if (Config.mode == "zen") {
      let currentTop = Math.floor(
        document.querySelectorAll("#words .word")[
          TestUI.currentWordElementIndex - 1
        ].offsetTop
      );
      if (!Config.showAllLines) TestUI.lineJump(currentTop);
    } else {
      currentInput = currentInput.slice(0, -1);
      updateWordElement(!Config.blindMode);
    }
  }

  Caret.updatePosition(currentInput);
}

window.addEventListener("beforeunload", (event) => {
  // Cancel the event as stated by the standard.
  if (
    (Config.mode === "words" && Config.words < 1000) ||
    (Config.mode === "time" && Config.time < 3600) ||
    Config.mode === "quote" ||
    (Config.mode === "custom" &&
      CustomText.isWordRandom &&
      CustomText.word < 1000) ||
    (Config.mode === "custom" &&
      CustomText.isTimeRandom &&
      CustomText.time < 1000) ||
    (Config.mode === "custom" &&
      !CustomText.isWordRandom &&
      CustomText.text.length < 1000)
  ) {
    //ignore
  } else {
    if (testActive) {
      event.preventDefault();
      // Chrome requires returnValue to be set.
      event.returnValue = "";
    }
  }
});

if (firebase.app().options.projectId === "monkey-type-dev-67af4") {
  $("#top .logo .bottom").text("monkey-dev");
  $("head title").text("Monkey Dev");
  $("body").append(
    `<div class="devIndicator tr">DEV</div><div class="devIndicator bl">DEV</div>`
  );
}

if (window.location.hostname === "localhost") {
  window.onerror = function (error) {
    Notifications.add(error, -1);
  };
  $("#top .logo .top").text("localhost");
  $("head title").text($("head title").text() + " (localhost)");
  firebase.functions().useFunctionsEmulator("http://localhost:5001");
  $("body").append(
    `<div class="devIndicator tl">local</div><div class="devIndicator br">local</div>`
  );
}

ManualRestart.set();

let configLoadDone;
let configLoadPromise = new Promise((v) => {
  configLoadDone = v;
});
loadConfigFromCookie();
configLoadDone();
Misc.getReleasesFromGitHub();
// getPatreonNames();

$(document).on("mouseenter", "#resultWordsHistory .words .word", (e) => {
  if (TestUI.resultVisible) {
    let input = $(e.currentTarget).attr("input");
    if (input != undefined)
      $(e.currentTarget).append(
        `<div class="wordInputAfter">${input
          .replace(/\t/g, "_")
          .replace(/\n/g, "_")}</div>`
      );
  }
});

$(document).on("click", "#bottom .leftright .right .current-theme", (e) => {
  if (e.shiftKey) {
    toggleCustomTheme();
  } else {
    // if (Config.customTheme) {
    //   toggleCustomTheme();
    // }
    currentCommands.push(commandsThemes);
    showCommandLine();
  }
});

$(document).on("click", ".keymap .r5 #KeySpace", (e) => {
  currentCommands.push(commandsKeymapLayouts);
  showCommandLine();
});

$(document).on("mouseleave", "#resultWordsHistory .words .word", (e) => {
  $(".wordInputAfter").remove();
});

$("#wpmChart").on("mouseleave", (e) => {
  $(".wordInputAfter").remove();
});

let mappedRoutes = {
  "/": "pageTest",
  "/login": "pageLogin",
  "/settings": "pageSettings",
  "/about": "pageAbout",
  "/account": "pageAccount",
  "/verify": "pageTest",
};

function handleInitialPageClasses(el) {
  $(el).removeClass("hidden");
  $(el).addClass("active");
}

$(document).ready(() => {
  handleInitialPageClasses(
    $(".page." + mappedRoutes[window.location.pathname])
  );
  if (window.location.pathname === "/") {
    $("#top .config").removeClass("hidden");
  }
  $("body").css("transition", ".25s");
  if (Config.quickTab) {
    $("#restartTestButton").addClass("hidden");
  }
  if (!Misc.getCookie("merchbannerclosed")) {
    $(".merchBanner").removeClass("hidden");
  } else {
    $(".merchBanner").remove();
  }
  $("#centerContent")
    .css("opacity", "0")
    .removeClass("hidden")
    .stop(true, true)
    .animate({ opacity: 1 }, 250, () => {
      if (window.location.pathname === "/verify") {
        const fragment = new URLSearchParams(window.location.hash.slice(1));
        if (fragment.has("access_token")) {
          const accessToken = fragment.get("access_token");
          const tokenType = fragment.get("token_type");
          verifyUserWhenLoggedIn = {
            accessToken: accessToken,
            tokenType: tokenType,
          };
          history.replaceState("/", null, "/");
        }
      } else if (window.location.pathname === "/account") {
        // history.replaceState("/", null, "/");
      } else if (/challenge_.+/g.test(window.location.pathname)) {
        //do nothing
        // }
      } else if (window.location.pathname !== "/") {
        let page = window.location.pathname.replace("/", "");
        changePage(page);
      }
    });
  settingsFillPromise.then(updateSettingsPage);
});

$(".scrollToTopButton").click((event) => {
  window.scrollTo(0, 0);
});

$(".merchBanner a").click((event) => {
  $(".merchBanner").remove();
  Misc.setCookie("merchbannerclosed", true, 365);
});

$(".merchBanner .fas").click((event) => {
  $(".merchBanner").remove();
  Misc.setCookie("merchbannerclosed", true, 365);
  Notifications.add(
    "Won't remind you anymore. Thanks for continued support <3",
    0,
    5
  );
});

$(".pageTest #copyWordsListButton").click(async (event) => {
  try {
    let words;
    if (Config.mode == "zen") {
      words = inputHistory.join(" ");
    } else {
      words = wordsList.slice(0, inputHistory.length).join(" ");
    }
    await navigator.clipboard.writeText(words);
    Notifications.add("Copied to clipboard", 0, 2);
  } catch (e) {
    Notifications.add("Could not copy to clipboard: " + e, -1);
  }
});

//stop space scrolling
window.addEventListener("keydown", function (e) {
  if (e.keyCode == 32 && e.target == document.body) {
    e.preventDefault();
  }
});

async function setupChallenge(challengeName) {
  let list = await Misc.getChallengeList();
  let challenge = list.filter((c) => c.name === challengeName)[0];
  let notitext;
  try {
    if (challenge === undefined) {
      throw "Challenge not found";
    }
    if (challenge.type === "customTime") {
      setTimeConfig(challenge.parameters[0], true);
      setMode("time", true);
      setDifficulty("normal", true);
      if (challenge.name === "englishMaster") {
        setLanguage("english_10k", true);
        setNumbers(true, true);
        setPunctuation(true, true);
      }
    }
    if (challenge.type === "customWords") {
      setWordCount(challenge.parameters[0], true);
      setMode("words", true);
      setDifficulty("normal", true);
    } else if (challenge.type === "customText") {
      CustomText.setText(challenge.parameters[0].split(" "));
      CustomText.setIsWordRandom(challenge.parameters[1]);
      CustomText.setWord(parseInt(challenge.parameters[2]));
      setMode("custom", true);
      setDifficulty("normal", true);
    } else if (challenge.type === "script") {
      let scriptdata = await fetch("/challenges/" + challenge.parameters[0]);
      scriptdata = await scriptdata.text();
      let text = scriptdata.trim();
      text = text.replace(/[\n\r\t ]/gm, " ");
      text = text.replace(/ +/gm, " ");
      CustomText.setText(text.split(" "));
      CustomText.setIsWordRandom(false);
      setMode("custom", true);
      setDifficulty("normal", true);
      if (challenge.parameters[1] != null) {
        setTheme(challenge.parameters[1]);
      }
      if (challenge.parameters[2] != null) {
        activateFunbox(challenge.parameters[2]);
      }
    } else if (challenge.type === "accuracy") {
      setTimeConfig(0, true);
      setMode("time", true);
      setDifficulty("master", true);
    } else if (challenge.type === "funbox") {
      activateFunbox(challenge.parameters[0]);
      setDifficulty("normal", true);
      if (challenge.parameters[1] === "words") {
        setWordCount(challenge.parameters[2], true);
      } else if (challenge.parameters[1] === "time") {
        setTimeConfig(challenge.parameters[2], true);
      }
      setMode(challenge.parameters[1], true);
      if (challenge.parameters[3] !== undefined) {
        setDifficulty(challenge.parameters[3], true);
      }
    }
    ManualRestart.set();
    restartTest(false, true);
    notitext = challenge.message;
    $("#top .config").removeClass("hidden");
    $(".page.pageTest").removeClass("hidden");

    if (notitext === undefined) {
      Notifications.add(`Challenge '${challengeName}' loaded.`, 0);
    } else {
      Notifications.add("Challenge loaded. " + notitext, 0);
    }
  } catch (e) {
    Notifications.add("Something went wrong: " + e, -1);
  }
}
