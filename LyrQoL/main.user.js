// ==UserScript==
// @name         Lyr QoL
// @namespace    https://lyrania.co.uk
// @version      0.2.6
// @description  Something Something hi Midith
// @author       KeskeDutchie
// @match        *lyrania.co.uk/game.php
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lyrania.co.uk
// @downloadURL  https://github.com/KeskeDutchie/tampermonkey-scripts/raw/main/LyrQoL/main.user.js
// @updateURL    https://github.com/KeskeDutchie/tampermonkey-scripts/raw/main/LyrQoL/main.user.js
// ==/UserScript==

const chatwindow = document.getElementById("chatwindow");
const lootlog = document.getElementById("lootlog");
const content = document.getElementById("content");
const header = document.getElementById("header").querySelector("div.lrow");
const rightsidepanel = document.getElementById("side2");
const weaponupgrade = document.getElementById("equipstuff");
const tstimer = document.getElementById("tstimer");
const popup = document.getElementById("popup");
const username = document.getElementById("usernameli").firstChild.innerText;
let dropTracker;
let dropsContainer;
let drops = {};
let gmapDrops = {};
let actionCount = 0;
let guildActionCount = 0;
let defaultDropFilters = {
	"Platinum": true,
	"XP": true,
	"Health": true,
	"Attack": true,
	"Defence": true,
	"Accuracy": true,
	"Evasion": true,
	"Diamonds": true,
	"Sapphires": true,
	"Rubies": true,
	"Emeralds": true,
	"Opals": true,
	"Jade": true,
	"Jewel Fragments": true,
	"Tokens": true,
};
let dropFilters = defaultDropFilters;
let winCount = 0;
let lossCount = 0;

let bossDamageArray = [];

let questOpened = false;

const gems = ["Diamond", "Sapphire", "Ruby", "Emerald", "Opal", "Diamonds", "Sapphires", "Rubies", "Emeralds", "Opals"];

const roomCompleted = "https://www.pacdv.com/sounds/interface_sound_effects/sound95.wav";
const tsCompleted = "https://www.pacdv.com/sounds/interface_sound_effects/sound92.wav";

if (Notification.permission !== "denied") {
	Notification.requestPermission();
}

(async function () {
	initTracker();
	loadFilters();
	loadDrops();
	updateTracker();
	interval();

	const contentObserver = new MutationObserver(mutations => {
		const travelList = $("#travellist")[0];
		if (travelList) {
			const prev = document.createElement("input");
			prev.type = "button";
			prev.value = "Previous";
			prev.setAttribute("onclick", 'if ($("#travellist")[0].selectedIndex != 0) {$("#travellist")[0].selectedIndex -= 1;}');
			$("#travellist")[0].parentNode.insertBefore(prev, $("#travellist")[0].parentNode.children[2]);
			prev.outerHTML += " ";
			const next = document.createElement("input");
			next.type = "button";
			next.value = "Next";
			next.setAttribute(
				"onclick",
				'if ($("#travellist")[0].selectedIndex != $("#travellist")[0].children.length - 1) {$("#travellist")[0].selectedIndex += 1;}'
			);
			$("#travellist")[0].parentNode.insertBefore(next, $("#travellist")[0].parentNode.children[4]);
			next.outerHTML = " " + next.outerHTML;
		}
		const battleSummary = content.querySelectorAll("div.lrow")[1]?.children[1];
		if (battleSummary) {
			let dropObj = "drops";
			if ($(".battleContainer")[0].children[1].innerText.includes("Shadow of ")) {
				dropObj = "gmapDrops";
				guildActionCount++;
				if (
					!content.querySelectorAll("div.strong.text-center")[0] &&
					content.querySelector("#content > div:nth-child(2) > div.flex-content").lastChild &&
					document.querySelector("#timer").innerText.slice(-1) == "6"
				) {
					setTimeout(() => {
						playAudio(roomCompleted);
					}, 6e3);
				}
			} else {
				actionCount++;
				if (!parseFor(battleSummary, "Gold")) {
					if (!parseFor(battleSummary, "You were defeated")) {
						winCount++;
						return updateTracker();
					}
					lossCount++;
					return updateTracker();
				}
				winCount++;
			}

			if ($("#treasuryreceivedGDP")[0]) {
				if (!eval(dropObj).Platinum) eval(dropObj).Platinum = 0;

				eval(dropObj).Platinum += platToMoney($("#treasuryreceivedGDP")[0].innerText.split("received ")[1].split(" from")[0].replace(/,/g, ""));
			}

			if (platToMoney(parseFor(battleSummary, "Gold: ").split(": ")[1].split(" -")[0].replace(/,/g, "")) > 0) {
				if (!eval(dropObj).Platinum) eval(dropObj).Platinum = 0;

				eval(dropObj).Platinum += platToMoney(parseFor(battleSummary, "Gold: ").split(": ")[1].split(" -")[0].replace(/,/g, ""));
			}

			if (eval(parseFor(battleSummary, "Exp").split("- ")[1].split("*")[0].replace(/,/g, "")) > 0) {
				if (!eval(dropObj).XP) eval(dropObj).XP = 0;

				eval(dropObj).XP += eval(parseFor(battleSummary, "Exp").split("- ")[1].split("*")[0].replace(/,/g, ""));

				let expPerAction = valuePerHour(eval(dropObj).XP) / 600;
				let currentLevel = eval(document.getElementById("lvlli").innerText.replace(/,/g, ""));
				let [bankedExperience, neededExperience] = document
					.getElementById("expli")
					.firstChild.dataset.tippyContent.replace(/,/g, "")
					.split("/")
					.map(Number);
				let finalLevel =
					(1 / 50) *
					(Math.sqrt(
						4 * Math.pow(expPerAction, 2) -
							100 * expPerAction * (2 * currentLevel + 1) +
							25 * (8 * bankedExperience + 25 * Math.pow(2 * currentLevel + 1, 2))
					) +
						2 * expPerAction -
						25);

				document.getElementById("expli").firstChild.innerText =
					(Math.round((bankedExperience / neededExperience) * 10000) / 100).toLocaleString() + "%";
				document.getElementById("lvlli").innerText += " (" + Math.floor(finalLevel).toLocaleString() + ")";
			}

			if (parseFor(battleSummary, "Guild Statue Drops")) {
				let statueDrops = parseFor(battleSummary, "Guild Statue Drops").split(": ")[1].split(" ");
				for (const drop of statueDrops) {
					switch (drop[1]) {
						case "D":
							if (!eval(dropObj).Diamonds) eval(dropObj).Diamonds = 0;
							eval(dropObj).Diamonds += +drop[0];
							break;
						case "S":
							if (!eval(dropObj).Sapphires) eval(dropObj).Sapphires = 0;
							eval(dropObj).Sapphires += +drop[0];
							break;
						case "R":
							if (!eval(dropObj).Rubies) eval(dropObj).Rubies = 0;
							eval(dropObj).Rubies += +drop[0];
							break;
						case "E":
							if (!eval(dropObj).Emeralds) eval(dropObj).Emeralds = 0;
							eval(dropObj).Emeralds += +drop[0];
							break;
						case "O":
							if (!eval(dropObj).Opals) eval(dropObj).Opals = 0;
							eval(dropObj).Opals += +drop[0];
							break;
						case "J":
							if (drop.length == 2) {
								if (!eval(dropObj).Jade) eval(dropObj).Jade = 0;
								eval(dropObj).Jade += +drop[0];
								break;
							}
							if (!eval(dropObj)["Jewel Fragments"]) eval(dropObj)["Jewel Fragments"] = 0;
							eval(dropObj)["Jewel Fragments"] += +drop[0];
							break;
					}
				}
			}
			updateTracker();
			return;
		}
		const bossSummary = content.querySelector("div");
		if (bossSummary && parseFor(bossSummary, "terrible")) {
			const tickDamage = getBossTickDamage(bossSummary);
			bossDamageArray.push(tickDamage);
			if (bossDamageArray.length > 10) bossDamageArray.shift();
			const totalDamage = parseFor(bossSummary, "You have done").split("done ")[1].split(" damage")[0].replace(/,/g, "");
			const timeRemainingArray = parseFor(bossSummary, "minutes").split("another ")[1].split(" seconds")[0].split(" minutes and ");
			const timeRemaining = parseInt(timeRemainingArray[0]) * 60 + parseFloat(timeRemainingArray[1]);
			let averageDamage = bossDamageArray[0];
			for (let i = 1; i < bossDamageArray.length; i++) {
				averageDamage += bossDamageArray[i];
			}
			averageDamage /= bossDamageArray.length;
			const predictedDamage = parseInt(totalDamage) + Math.floor(timeRemaining / 4.7) * averageDamage;

			bossSummary.insertBefore(
				document.createTextNode("(You have done " + tickDamage.toLocaleString() + " damage to this boss this action)"),
				insertPosition(bossSummary, "SPAN")
			);
			bossSummary.insertBefore(document.createElement("br"), insertPosition(bossSummary, "SPAN"));
			bossSummary.insertBefore(
				document.createTextNode("(You are predicted to deal " + predictedDamage.toLocaleString() + " damage to this boss)"),
				insertPosition(bossSummary, "SPAN")
			);
			bossSummary.insertBefore(document.createElement("br"), insertPosition(bossSummary, "SPAN"));
		}
	}).observe(content, {
		childList: true,
	});

	const lootObserver = new MutationObserver(mutations => {
		const battleSummary = content.querySelectorAll("div.lrow")[1]?.children[1];

		if (!battleSummary) return;

		if (!mutations.length > 0) return;

		let obj;

		obj = content.querySelectorAll("div.lrow")[2]; // Battle Screen

		if ($(".battleContainer")[0]?.children[1].innerText.includes("Shadow of ")) {
			let valueChanged = false;

			if (!obj) {
				obj = content.querySelectorAll("div.strong.text-center")[0]; // Map Auto
				valueChanged = true;
			}
			if (!obj) {
				obj = content.querySelector("#content > div:nth-child(2) > div.flex-content").lastChild; // Map Room Finished or Single Map Battle
				valueChanged = true;
			}
			if (valueChanged) obj.previousSibling.remove();
		}

		mutations.forEach(mutation => {
			if (!mutation.addedNodes[0]) return;
			const dropText = mutation.addedNodes[0].innerText.split("] ")[1];

			const dropTracked = parseDrops(dropText);

			if (!dropTracked) console.log(dropText);

			obj.before(document.createTextNode(dropText));
			obj.before(document.createElement("br"));
		});

		if (valueChanged) obj.before(document.createElement("br"));
	}).observe(lootlog, {
		childList: true,
	});

	const chatObserver = new MutationObserver(mutations => {
		if (mutations.length >= 10) return; // Either init or really fast spam, so we ignore
		mutations.forEach(mutation => {
			if (!mutation.addedNodes[0]) return;
			const message = mutation.addedNodes[0].getElementsByClassName("guildchatcolor")[0]?.getElementsByTagName("span")[0]?.innerText;
			if (message?.includes(username) && message.includes("plat ")) {
				if (!eval("gmapDrops").Platinum) eval("gmapDrops").Platinum = 0;

				eval("gmapDrops").Platinum += eval(message.split("paid ")[1].split(" plat")[0].replace(/,/g, ""));
				updateTracker();
			}
		});
	}).observe(chatwindow, {
		childList: true,
	});

	const equipmentObserver = new MutationObserver(mutations => {
		if (mutations[0].addedNodes.length == 0) {
			dropTracker.style.display = "block";
			return;
		}
		dropTracker.style.display = "none";
	}).observe(weaponupgrade, {
		childList: true,
	});

	const popupObserver = new MutationObserver(mutations => {
		let target = mutations[0].target;
		console.log(target);
		let questMob = $("#quest_mob")[0];
		if (questMob) {
			questMob.style.marginBottom = 10;
			if (!questOpened) {
				questOpened = true;
				questMob.parentNode.insertBefore(
					document.createElement("br"),
					questMob.parentNode.children[Array.prototype.indexOf.call(questMob.parent.children, questMob) + 1]
				);
				const prev = document.createElement("input");
				prev.type = "button";
				prev.value = "Previous";
				prev.setAttribute("onclick", 'if ($("#quest_mob")[0].selectedIndex != 0) {$("#quest_mob")[0].selectedIndex -= 1;}');
				questMob.parentNode.insertBefore(prev, questMob.parentNode.children[Array.prototype.indexOf.call(questMob.parent.children, questMob) - 1]);
				prev.outerHTML += " ";
				const next = document.createElement("input");
				next.type = "button";
				next.value = "Next";
				next.setAttribute(
					"onclick",
					'if ($("#quest_mob")[0].selectedIndex != $("#quest_mob")[0].children.length - 1) {$("#quest_mob")[0].selectedIndex += 1;}'
				);
				questMob.parentNode.insertBefore(next, questMob.parentNode.children[Array.prototype.indexOf.call(questMob.parent.children, questMob) + 2]);
				next.outerHTML = " " + next.outerHTML;
			}
			return;
		} else questOpened = false;
		if (target.tagName == "A") {
			let filterText = mutations[0].target.parentNode.textContent.split("  ");
			dropFilters = JSON.parse(format(filterText));
			saveFilters();
			updateTracker();
		}
	}).observe(popup, {
		childList: true,
		subtree: true,
	});
})();

function interval() {
	try {
		checkTS();
	} catch (e) {} // Wrapping this in a try catch just so that it doesn't prevent the script from running if you refresh whilst TS are not running
	setTimeout(interval, 6e4);
}

function checkTS() {
	if ($("#tsjob1")[0].firstChild.tagName == "A") {
		playAudio(tsCompleted);
		return notification("No Tradeskill Running.", "You do not currently have any tradeskills running.");
	}
	if ($("#ts1")[0]?.innerText === "00:00") {
		playAudio(tsCompleted);
		return notification("Tradeskill Completed.", "You have one or more tradeskills that have been completed.");
	}
	if ($("#ts2")[0]?.innerText === "00:00") {
		playAudio(tsCompleted);
		return notification("Tradeskill Completed.", "You have one or more tradeskills that have been completed.");
	}
	if ($("#ts3")[0]?.innerText === "00:00") {
		playAudio(tsCompleted);
		return notification("Tradeskill Completed.", "You have one or more tradeskills that have been completed.");
	}
	if ($("#ts4")[0]?.innerText === "00:00") {
		playAudio(tsCompleted);
		return notification("Tradeskill Completed.", "You have one or more tradeskills that have been completed.");
	}
}

function format(filterText) {
	return JSON.stringify(filterText)
		.replace("[", "{")
		.replace(/:/g, '":')
		.replace(/",/g, ",")
		.replace(',""', "")
		.replace("]", "}")
		.replace(/ /g, "")
		.replace("lF", "l F");
}

function getBossTickDamage(bossSummary) {
	let tickDamage = 0;
	for (let i = 0; bossSummary.innerText.split("\n")[4 + i].startsWith("You"); i++) {
		tickDamage += Number(bossSummary.innerText.split("\n")[4 + i].split("for ")[1].split("!")[0].replace(/,/g, ""));
	}
	return tickDamage;
}

function parseFor(obj, str) {
	for (let i = 0; i < obj.innerText.split("\n").length; i++) {
		let line = obj.innerText.split("\n")[i];
		if (line.includes(str)) return line;
	}
}

function parseDrops(dropText) {
	let dropObj = "drops";
	if ($(".battleContainer")[0].children[1].innerText.includes("Shadow of ")) dropObj = "gmapDrops";
	for (let gem of gems) {
		if (dropText.includes(gem)) {
			gem = pluralize(gem);
			if (!eval(dropObj)[gem]) eval(dropObj)[gem] = 0;

			eval(dropObj)[gem] += eval(dropText.split("(")[1].split(" level")[0]);

			updateTracker();

			return true;
		}
	}
	if (dropText.includes("jade")) {
		if (!eval(dropObj).Jade) eval(dropObj).Jade = 0;

		eval(dropObj).Jade += eval(dropText.split("(")[1].split(" level")[0]);

		updateTracker();

		return true;
	}
	if (dropText.includes("gained")) {
		let num = dropText.split("gained ")[1].split("!")[0];
		let stat = num.split(" ")[1];
		num = eval(num.split(" ")[0]);

		if (!eval(dropObj)[stat]) eval(dropObj)[stat] = 0;

		eval(dropObj)[stat] += num;

		updateTracker();

		return true;
	}
	if (dropText.includes("fragments")) {
		if (!eval(dropObj)["Jewel Fragments"]) eval(dropObj)["Jewel Fragments"] = 0;

		eval(dropObj)["Jewel Fragments"] += eval(dropText.split("(")[1].split(" level")[0]);

		updateTracker();

		return true;
	}
	if (dropText.includes("platinum") || dropText.includes("gold") || dropText.includes("silver")) {
		eval(dropObj).Platinum +=
			platToMoney(dropText.split("(")[1].split(" level")[0].split(" +")[0]) + platToMoney(dropText.split("(")[1].split(" level")[0].split(" +")[1]);

		updateTracker();

		return true;
	}
	if (dropText.includes("token")) {
		if (!eval(dropObj).Tokens) eval(dropObj).Tokens = 0;

		eval(dropObj).Tokens += eval(dropText.split("found ")[1].split(" token")[0]);

		updateTracker();

		return true;
	}
	return false;
}

function initTracker() {
	dropTracker = document.createElement("div");
	dropTracker.id = "droptracker";
	dropTracker.style.visibility = "visible";

	let header = document.createElement("h3");
	header.textContent = "Drop Tracker";
	header.style.marginTop = "0.5em";
	header.style.marginBottom = 0;

	dropsContainer = document.createElement("div");
	dropsContainer.id = "drops";
	dropsContainer.style.whiteSpace = "pre-line";
	dropsContainer.textContent = "Action Count: 0";

	let resetText = document.createElement("a");
	resetText.textContent = "Reset Tracker";
	resetText.href = "#";
	resetText.addEventListener("click", function (e) {
		e.preventDefault();
		resetTracker();
	});

	let filterText = document.createElement("a");
	filterText.textContent = "Manage Filters";
	filterText.href = "#";
	filterText.addEventListener("click", function (e) {
		e.preventDefault();
		openpopuppane(filterPane());
	});

	let filterResetText = document.createElement("a");
	filterResetText.textContent = "Reset Filters";
	filterResetText.href = "#";
	filterResetText.addEventListener("click", function (e) {
		e.preventDefault();
		resetFilters();
	});

	dropTracker.appendChild(header);
	dropTracker.appendChild(document.createElement("hr"));
	dropTracker.appendChild(dropsContainer);
	dropTracker.appendChild(resetText);
	dropTracker.appendChild(document.createElement("br"));
	dropTracker.appendChild(filterText);
	dropTracker.appendChild(document.createElement("br"));
	dropTracker.appendChild(filterResetText);

	rightsidepanel.appendChild(dropTracker);
}

function updateTracker() {
	let dropObj = "drops";
	$("#droptracker")[0].firstChild.innerText = "Drop Tracker";
	if ($(".battleContainer")[0]?.children[1].innerText.includes("Shadow of ")) {
		dropObj = "gmapDrops";
		$("#droptracker")[0].firstChild.innerText = "Guild Drop Tracker";
	}
	let indent = false;
	dropsContainer.textContent = "";
	for (const [key, value] of Object.entries(eval(dropObj))) {
		if (dropFilters[key]) {
			indent = true;
			dropsContainer.textContent += `${key}: ${value.toLocaleString()} (${valuePerHour(value).toLocaleString()}/hour)\r\n`;
		}
	}
	if (indent) dropsContainer.textContent += "\r\n";
	if ($("#droptracker")[0].firstChild.innerText == "Drop Tracker") {
		dropsContainer.textContent += `Action Count: ${actionCount.toLocaleString()}\r\n`;
		dropsContainer.textContent += `Wins/Losses: ${winCount.toLocaleString()}/${lossCount.toLocaleString()} (${
			parseInt((winCount / actionCount) * 10000) / 100
		}%)`;
	}
	if ($("#droptracker")[0].firstChild.innerText == "Guild Drop Tracker") {
		dropsContainer.textContent += `Action Count: ${guildActionCount.toLocaleString()}\r\n`;
	}
	saveDrops();
}

function resetTracker() {
	dropsContainer.textContent = "Action Count: 0\r\n";
	if ($("#droptracker")[0].firstChild.innerText == "Drop Tracker") {
		actionCount = 0;
		drops = {};
		dropsContainer.textContent += "Wins/Losses: 0/0 (NaN%)";
		winCount = 0;
		lossCount = 0;
	}
	if ($("#droptracker")[0].firstChild.innerText == "Guild Drop Tracker") {
		guildActionCount = 0;
		gmapDrops = {};
	}
	saveDrops();
}

function filterPane() {
	let filterText = "";
	for (const [key, value] of Object.entries(dropFilters)) {
		filterText += `${key}: <a href="#" onclick="(function(e){e.preventDefault(); textContent = !eval(textContent);})(event)">${value}</a><br>  `;
	}
	return filterText;
}

function loadFilters() {
	if (localStorage.getItem("DropFilter")) {
		dropFilters = JSON.parse(localStorage.getItem("DropFilter"));
	}
}

function saveFilters() {
	localStorage.setItem("DropFilter", JSON.stringify(dropFilters));
}

function loadDrops() {
	if (localStorage.getItem("Drops")) {
		drops = JSON.parse(localStorage.getItem("Drops"));
	}
	if (localStorage.getItem("Guild Drops")) {
		gmapDrops = JSON.parse(localStorage.getItem("Guild Drops"));
	}
	if (localStorage.getItem("ActionData")) {
		let actionData = JSON.parse(localStorage.getItem("ActionData"));
		actionCount = actionData.actionCount;
		guildActionCount = actionData.guildActionCount;
		winCount = actionData.winCount;
		lossCount = actionData.lossCount;
	}
}

function saveDrops() {
	localStorage.setItem("Drops", JSON.stringify(drops));
	localStorage.setItem("Guild Drops", JSON.stringify(gmapDrops));
	localStorage.setItem(
		"ActionData",
		JSON.stringify({
			actionCount: actionCount,
			guildActionCount: guildActionCount,
			winCount: winCount,
			lossCount: lossCount,
		})
	);
}

function resetFilters() {
	dropFilters = defaultDropFilters;
	saveFilters();
	updateTracker();
}

function playAudio(sound, volume = null) {
	let audio = new Audio(sound);
	if (volume == null) {
		volume = 0.3;
	}
	audio.volume = volume;
	audio.play();
}

function notification(title, content) {
	let notification;
	if (!("Notification" in window)) {
		alert("This browser does not support desktop notification");
	} else if (Notification.permission === "granted") {
		notification = new Notification(title, { body: content });
	} else if (Notification.permission !== "denied") {
		Notification.requestPermission().then(function (permission) {
			if (permission === "granted") {
				notification = new Notification(title, { body: content });
			}
		});
	}
	notification.onclick = () => {
		window.focus();
		this.close();
	};
	setTimeout(notification.close.bind(notification), 6e6);
}

function valuePerHour(value) {
	if ($("#droptracker")[0].firstChild.innerText == "Drop Tracker") return Math.round((value / (actionCount / 600)) * 100) / 100;
	return Math.round((value / (guildActionCount / 600)) * 100) / 100;
}

function insertPosition(obj, tagName) {
	for (let i = 0; i < obj.children.length; i++) {
		if (obj.children[i].tagName == tagName) return obj.children[i];
	}
}

function pluralize(gem) {
	if (gems.indexOf(gem) < 5) return gems[gems.indexOf(gem) + 5];
	return gem;
}

function moneyToPlat(e) {
	let t = Math.floor(e / 1e6),
		n = Math.floor((e - 1e6 * t) / 1e4),
		a = Math.floor((e - 1e6 * t - 1e4 * n) / 100),
		o = Math.floor(e - 1e6 * t - 1e4 * n - 100 * a);
	if (t > 1e3) return t + "p";
	if (t > 0) var l = t + "p " + n + "g " + a + "s " + o + "c";
	if (0 == t && n > 0) l = n + "g " + a + "s " + o + "c";
	if (0 == t && 0 == n && a > 0) l = a + "s " + o + "c";
	if (0 == t && 0 == n && 0 == a) l = o + "c";
	return l;
}

function platToMoney(plat) {
	let money = 0;
	if (plat.includes("p")) {
		money += eval(plat.split("p")[0]);
		plat = plat.split("p")[1];
	}
	if (plat.includes("g")) {
		money += eval(plat.split("g")[0]) / 1e2;
		plat = plat.split("g")[1];
	}
	if (plat.includes("s")) {
		money += eval(plat.split("s")[0]) / 1e4;
		plat = plat.split("s")[1];
	}
	if (plat.includes("c")) {
		money += eval(plat.split("c")[0]) / 1e6;
	}
	return money;
}
