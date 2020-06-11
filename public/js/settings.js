function updateSettingsPage(){

    let themesEl = $(".pageSettings .section.themes .buttons").empty();
    themesList.forEach(theme => {
        themesEl.append(`<div class="theme" theme='${theme.name}' style="color:${theme.textColor};background:${theme.bgColor}">${theme.name.replace('_', ' ')}</div>`); 
    })

    let langEl = $(".pageSettings .section.languages .buttons").empty();
    Object.keys(words).forEach(language => {
        langEl.append(`<div class="language" language='${language}'>${language.replace('_', ' ')}</div>`);
    })

    let layoutEl = $(".pageSettings .section.layouts .buttons").empty();
    Object.keys(layouts).forEach(layout => {
        layoutEl.append(`<div class="layout button" layout='${layout}'>${layout.replace('_', ' ')}</div>`);
    });

    if(firebase.auth().currentUser !== null && dbSnapshot !== null){
        let tagsEl = $(".pageSettings .section.tags .tagsList").empty();
        dbSnapshot.tags.forEach(tag => {
            if(activeTags.includes(tag.id)){
                tagsEl.append(`
            
                <div class="tag" id="${tag.id}">
                    <div class="active" active="true">
                        <i class="fas fa-check-square"></i>
                    </div>
                    <div class="title">${tag.name}</div>
                    <div class="editButton"><i class="fas fa-pen"></i></div>
                    <div class="removeButton"><i class="fas fa-trash"></i></div>
                </div>
            
            `);
            }else{
                tagsEl.append(`
            
                <div class="tag" id="${tag.id}">
                    <div class="active" active="false">
                        <i class="fas fa-square"></i>
                    </div>
                    <div class="title">${tag.name}</div>
                    <div class="editButton"><i class="fas fa-pen"></i></div>
                    <div class="removeButton"><i class="fas fa-trash"></i></div>
                </div>
            
            `);
            }
            
        });
        $(".pageSettings .section.tags").removeClass('hidden');
    }else{
        $(".pageSettings .section.tags").addClass('hidden');
    }
    

    setSettingsButton('smoothCaret', config.smoothCaret);
    setSettingsButton('quickTab', config.quickTab);
    setSettingsButton('liveWpm', config.showLiveWpm);
    setSettingsButton('timerBar', config.showTimerBar)
    setSettingsButton('keyTips', config.showKeyTips);
    setSettingsButton('freedomMode', config.freedomMode);
    setSettingsButton('blindMode', config.blindMode);
    setSettingsButton('quickEnd', config.quickEnd);
    setSettingsButton('flipTestColors', config.flipTestColors);
    setSettingsButton('discordDot', config.showDiscordDot);
    setSettingsButton('extraTestColor', config.extraTestColor);


    setActiveThemeButton();
    setActiveLanguageButton();
    setActiveLayoutButton();
    setActiveFontSizeButton();
    setActiveDifficultyButton();
    setActiveCaretStyleButton();

    if (config.showKeyTips) {
        $(".pageSettings .tip").removeClass('hidden');
    } else {
        $(".pageSettings .tip").addClass('hidden');
    }


}

function setActiveThemeButton() {
    $(`.pageSettings .section.themes .theme`).removeClass('active');
    $(`.pageSettings .section.themes .theme[theme=${config.theme}]`).addClass('active');
}

function setActiveLayoutButton(){
    $(`.pageSettings .section.layouts .layout`).removeClass('active');
    $(`.pageSettings .section.layouts .layout[layout=${config.layout}]`).addClass('active');
}

function setActiveFontSizeButton() {
    $(`.pageSettings .section.fontSize .buttons .button`).removeClass('active');
    $(`.pageSettings .section.fontSize .buttons .button[fontsize=`+config.fontSize+`]`).addClass('active');
}

function setActiveDifficultyButton() {
    $(`.pageSettings .section.difficulty .buttons .button`).removeClass('active');
    $(`.pageSettings .section.difficulty .buttons .button[difficulty=`+config.difficulty+`]`).addClass('active');
}

function setActiveLanguageButton() {
    $(`.pageSettings .section.languages .language`).removeClass('active');
    $(`.pageSettings .section.languages .language[language=${config.language}]`).addClass('active'); 
}

function setActiveCaretStyleButton() {
    $(`.pageSettings .section.caretStyle .buttons .button`).removeClass('active');
    $(`.pageSettings .section.caretStyle .buttons .button[caret=`+config.caretStyle+`]`).addClass('active');
}

function setSettingsButton(buttonSection,tf) {
    if (tf) {
        $(".pageSettings .section."+buttonSection+" .buttons .button.on").addClass('active');
        $(".pageSettings .section."+buttonSection+" .buttons .button.off").removeClass('active');
    } else {
        $(".pageSettings .section."+buttonSection+" .buttons .button.off").addClass('active');
        $(".pageSettings .section."+buttonSection+" .buttons .button.on").removeClass('active');
    }
}

function updateActiveTags(){
    activeTags = [];
    $.each($('.pageSettings .section.tags .tagsList .tag'), (index, tag) => {
        if($(tag).children('.active').attr('active') === 'true') activeTags.push($(tag).attr('id'));
    })
}

//smooth caret
$(".pageSettings .section.smoothCaret .buttons .button.on").click(e => {
    setSmoothCaret(true);
    showNotification('Smooth caret on', 1000);
    setSettingsButton('smoothCaret', config.smoothCaret);
})
$(".pageSettings .section.smoothCaret .buttons .button.off").click(e => {
    setSmoothCaret(false);
    showNotification('Smooth caret off', 1000);
    setSettingsButton('smoothCaret', config.smoothCaret);
})

//quick tab
$(".pageSettings .section.quickTab .buttons .button.on").click(e => {
    setQuickTabMode(true);
    showNotification('Quick tab on', 1000);
    setSettingsButton('quickTab', config.quickTab);
})
$(".pageSettings .section.quickTab .buttons .button.off").click(e => {
    setQuickTabMode(false);
    showNotification('Quick tab off', 1000);
    setSettingsButton('quickTab', config.quickTab);
})

//live wpm
$(".pageSettings .section.liveWpm .buttons .button.on").click(e => {
    config.showLiveWpm = true;
    saveConfigToCookie();
    showNotification('Live WPM on', 1000);
    setSettingsButton('liveWpm', config.showLiveWpm);
})
$(".pageSettings .section.liveWpm .buttons .button.off").click(e => {
    config.showLiveWpm = false;
    saveConfigToCookie();
    showNotification('Live WPM off', 1000);
    setSettingsButton('liveWpm', config.showLiveWpm);
})

//timer bar
$(".pageSettings .section.timerBar .buttons .button.on").click(e => {
    config.showTimerBar = true;
    saveConfigToCookie();
    showNotification('Timer bar on', 1000);
    setSettingsButton('timerBar', config.showTimerBar);
})
$(".pageSettings .section.timerBar .buttons .button.off").click(e => {
    config.showTimerBar = false;
    saveConfigToCookie();
    showNotification('Timer bar off', 1000);
    setSettingsButton('timerBar', config.showTimerBar);
})

//freedom mode
$(".pageSettings .section.freedomMode .buttons .button.on").click(e => {
    setFreedomMode(true);
    saveConfigToCookie();
    showNotification('Freedom mode on', 1000);
    setSettingsButton('freedomMode', config.freedomMode);
})
$(".pageSettings .section.freedomMode .buttons .button.off").click(e => {
    setFreedomMode(false);
    saveConfigToCookie();
    showNotification('Freedom mode off', 1000);
    setSettingsButton('freedomMode', config.freedomMode);
})

//keytips
$(".pageSettings .section.keyTips .buttons .button.on").click(e => {
    setKeyTips(true);
    showNotification('Key tips on', 1000);
    setSettingsButton('keyTips', config.showKeyTips);
    if (config.showKeyTips) {
        $(".pageSettings .tip").removeClass('hidden');
    } else {
        $(".pageSettings .tip").addClass('hidden');
    }
})
$(".pageSettings .section.keyTips .buttons .button.off").click(e => {
    setKeyTips(false);
    showNotification('Key tips off', 1000);
    setSettingsButton('keyTips', config.showKeyTips);
    if (config.showKeyTips) {
        $(".pageSettings .tip").removeClass('hidden');
    } else {
        $(".pageSettings .tip").addClass('hidden');
    }
})

//keytips
$(".pageSettings .section.discordDot .buttons .button.on").click(e => {
    setDiscordDot(true);
    setSettingsButton('discordDot', config.showDiscordDot);
})
$(".pageSettings .section.discordDot .buttons .button.off").click(e => {
    setDiscordDot(false);
    setSettingsButton('discordDot', config.showDiscordDot);
})

//themes
// $(document).on("mouseover",".pageSettings .section.themes .theme", (e) => {
//     let theme = $(e.currentTarget).attr('theme');
//     previewTheme(theme);
// })

$(document).on("click",".pageSettings .section.themes .theme", (e) => {
    let theme = $(e.currentTarget).attr('theme');
    setTheme(theme);
    setActiveThemeButton();
})

// $(document).on("mouseleave",".pageSettings .section.themes", (e) => {
//     setTheme(config.theme);
// })

//languages
$(document).on("click",".pageSettings .section.languages .language", (e) => {
    let language = $(e.currentTarget).attr('language');
    changeLanguage(language);
    showNotification('Language changed', 1000);
    restartTest();
    setActiveLanguageButton();
})

//layouts
$(document).on("click",".pageSettings .section.layouts .layout", (e) => {
    console.log("clicked")
    let layout = $(e.currentTarget).attr('layout');
    changeLayout(layout);
    showNotification('Layout changed', 1000);
    restartTest();
    setActiveLayoutButton();
})

//fontsize
$(document).on("click",".pageSettings .section.fontSize .button", (e) => {
    let fontSize = $(e.currentTarget).attr('fontsize');
    changeFontSize(fontSize);
    showNotification('Font size changed', 1000);
    setActiveFontSizeButton();
})

//difficulty
$(document).on("click",".pageSettings .section.difficulty .button", (e) => {
    let difficulty = $(e.currentTarget).attr('difficulty');
    setDifficulty(difficulty);
    showNotification('Difficulty changed', 1000);
    setActiveDifficultyButton();
})

//caret style
$(document).on("click",".pageSettings .section.caretStyle .button", (e) => {
    let caretStyle = $(e.currentTarget).attr('caret');
    setCaretStyle(caretStyle);
    showNotification('Caret style updated', 1000);
    setActiveCaretStyleButton();
})

//blind mode
$(".pageSettings .section.blindMode .buttons .button.on").click(e => {
    setBlindMode(true);
    showNotification('Blind mode on', 1000);
    setSettingsButton('blindMode', config.blindMode);
})
$(".pageSettings .section.blindMode .buttons .button.off").click(e => {
    setBlindMode(false);
    showNotification('Blind mode off', 1000);
    setSettingsButton('blindMode', config.blindMode);
})

//blind mode
$(".pageSettings .section.quickEnd .buttons .button.on").click(e => {
    setQuickEnd(true);
    showNotification('Quick end on', 1000);
    setSettingsButton('quickEnd', config.quickEnd);
})
$(".pageSettings .section.quickEnd .buttons .button.off").click(e => {
    setQuickEnd(false);
    showNotification('Quick end off', 1000);
    setSettingsButton('quickEnd', config.quickEnd);
})

//flip test
$(".pageSettings .section.flipTestColors .buttons .button.on").click(e => {
    setFlipTestColors(true);
    showNotification('Flip test colors on', 1000);
    setSettingsButton('flipTestColors', config.flipTestColors);
})
$(".pageSettings .section.flipTestColors .buttons .button.off").click(e => {
    setFlipTestColors(false);
    showNotification('Flip test colors off', 1000);
    setSettingsButton('flipTestColors', config.flipTestColors);
})

//extra color
$(".pageSettings .section.extraTestColor .buttons .button.on").click(e => {
    setExtraTestColor(true);
    showNotification('Extra test color on', 1000);
    setSettingsButton('extraTestColor', config.extraTestColor);
})
$(".pageSettings .section.extraTestColor .buttons .button.off").click(e => {
    setExtraTestColor(false);
    showNotification('Extra test color off', 1000);
    setSettingsButton('extraTestColor', config.extraTestColor);
})

//tags
$(document).on("click",".pageSettings .section.tags .tagsList .tag .active",e => {
    let target = e.currentTarget;
    let tagid = $(target).parent('.tag').attr('id');
    if($(target).attr('active') === 'true'){
        $(target).attr('active','false');
        $(target).html('<i class="fas fa-square"></i>')
    }else{
        $(target).attr('active','true');
        $(target).html('<i class="fas fa-check-square"></i>')
    }
    updateActiveTags();
})

$(document).on("click",".pageSettings .section.tags .addTagButton",e => {
    showEditTags('add');
})

$(document).on("click",".pageSettings .section.tags .tagsList .tag .editButton",e => {
    let tagid = $(e.currentTarget).parent('.tag').attr('id');
    let name = $(e.currentTarget).siblings('.title').text();
    showEditTags('edit',tagid,name);
})

$(document).on("click",".pageSettings .section.tags .tagsList .tag .removeButton",e => {
    let tagid = $(e.currentTarget).parent('.tag').attr('id');
    let name = $(e.currentTarget).siblings('.title').text();
    showEditTags('remove',tagid,name);
})
