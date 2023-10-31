// ==UserScript==
// @name         Guild Boss Attendance Assistant
// @namespace    https://lyrania.co.uk
// @version      1.3
// @description  try to take over the world!
// @author       KeskeDutchie
// @match        *lyrania.co.uk/game.php
// @match        *dev.lyrania.co.uk/game.php
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lyrania.co.uk
// @updateUrl    https://raw.githubusercontent.com/KeskeDutchie/tampermonkey-scripts/main/Guild%20Boss%20Attendance%20Assistant/main.user.js
// @downloadUrl  https://raw.githubusercontent.com/KeskeDutchie/tampermonkey-scripts/main/Guild%20Boss%20Attendance%20Assistant/main.user.js
// ==/UserScript==

const chatwindow = document.getElementById("chatwindow");
const chattabs = document.getElementById("chattabs");

var attendanceLog;
var countText;

var users = [];
var count = 0;

(function () {
	"use strict";

	initLog();
    initUsers();

	const chatObserver = new MutationObserver(mutations => {
		if (mutations.length >= 10) return; // Either init or really fast spam, so we ignore
		mutations.forEach(mutation => {
			if (!mutation.addedNodes[0]) return;
			const message = mutation.addedNodes[0].getElementsByClassName("guildchatcolor")[0];
			if (message?.lastChild?.lastChild?.lastChild?.textContent?.includes("rolled")) {
				addUser(
					message.lastChild.firstChild.firstChild.innerText.replace("Mod ", "").replace("Admin ", "").replace("Community ", "").replace("Owner ", "")
				);
			}
		});
	}).observe(chatwindow, {
		childList: true,
	});
})();

function initLog() {
	attendanceLog = document.createElement("section");
	attendanceLog.id = "attendancelog";
	attendanceLog.classList.add("tab-content");
	attendanceLog.style.cssText =
		"position: relative;margin-top: 5px;float: left;min-height: 200px;height: 38vh;width: 100%;overflow: auto;padding-top: 5px;resize: vertical;font-size: 13px;" +
		"background-color: #000;border: 1px solid white;border-radius: 15px 0px 0px 0px;";

	const tabButton = document.createElement("a");
	tabButton.id = "attendancelogtab";
	tabButton.dataset.tab = "#attendancelog";
	tabButton.classList.add("nav-tab");
	tabButton.innerText = "Attendance Log";

	const copyButton = document.createElement("input");
	copyButton.type = "button";
	copyButton.id = "copybutton";
	copyButton.value = "Copy Log";
	copyButton.style.cssText = "float:right;margin-right:5px;";
	copyButton.onclick = () => {
		var usersString = "";
		for (var i = 0; i < users.length; i++) usersString += users[i] + ",";
		navigator.clipboard.writeText(usersString);
	};

	const resetButton = document.createElement("input");
	resetButton.type = "button";
	resetButton.id = "resetbutton";
	resetButton.value = "Reset Log";
	resetButton.style.float = "right";
	resetButton.onclick = () => {
		if (!confirm("Reset Attendance Log?")) return;
		users = [];
		setCount(0);
		while (attendanceLog.children.length > 0) {
			attendanceLog.lastChild.remove();
		}
        localStorage.setItem("Attendance Log", JSON.stringify({ users: [] }));
	};

	countText = document.createElement("div");
	countText.textContent = "Player Count: 0";
	countText.style.cssText = "float:right;padding:5px;";

	chattabs.insertBefore(attendanceLog, chattabs.children[2]);
	chattabs.children[3].append(tabButton);
	document.getElementById("chat").insertBefore(resetButton, chattabs);
	document.getElementById("chat").insertBefore(copyButton, chattabs);
	document.getElementById("chat").insertBefore(countText, chattabs);
}

function initUsers() {
    var rawLog = localStorage.getItem("Attendance Log");
    if (!rawLog) rawLog = JSON.stringify({ users: [] });
    var savedLog = JSON.parse(rawLog);
    for (var i = 0; i < savedLog.users.length; i++) {
        addUser(savedLog.users[i]);
    }
}

function addUser(user) {
	if (users.includes(user)) return;

	users.push(user);
	const chatObject = document.createElement("div");
	chatObject.classList.add("chatline");
	chatObject.textContent = user;
	attendanceLog.prepend(chatObject);
	setCount(++count);
    localStorage.setItem("Attendance Log", JSON.stringify({ users: users }));
}

function setCount(c) {
	count = c;
	countText.textContent = "Player Count: " + count;
}
