// Event IDs
let eventIDs = {
	ENT: 'e',
	EXP: 'x',
	FIRE: 'f',
	OVER: 'o',
	NEXT: 'n',
	COMP: 'c',
	RST: 'r',
	STRT: 's'
}
// Maths
let mathFloor=Math.floor, mathRandom=Math.random, Tau=Math.PI*2;
// Enemy patterns
let enemyPatterns = [
			['002','11011','003','11011','002'],
			['12','11211','02311','11211','12'],
			['00203','02111','2341','02111','00203'],
			['00314','02121','102345','02121','00314'],
			['102345','303404','543005','303404','102345'],
			['55555','003333','0000553','003333','55555'],
			['1111111','00003305','0004555','00003305','1111111'],
			['00405','040504','40505','040504','00405'],
			['2131415','1213141','2131415','1213141','2131415'],
			['50304','','50305','','50304']
		];

let getLevelPattern = () => {
	// Auto-generate swarms when curated levels are done
	return gameLevel < enemyPatterns.length ? {r:enemyPatterns[gameLevel]} : generatePattern()
}
let generatePattern = () => {
	let f = getFeatures();
	let r1 = generateRow(f);
	let r2 = generateRow(f);
	return {r:[r1, r2, generateRow(f), r2, r1]}
}
let generateRow = ({c, d}) => {
	let r = '';
	for(let i = 0; i < c; i++){
		r += mathRandom() < d ? Math.round(mathRandom()*5) : '0';
	}
	return r;
}
let getFeatures = () => {
	/* Alter auto-generated swarm features based on gameLevel 
		Prop: level	
		return columns, difficulty (0-1)
	*/
	let c=6, d=.6;
	if(gameLevel < 15){
		c = 5;
	}
	else if(gameLevel < 20){
		d = .7;
	}
	else {
		c = 9;
		d = .8;
	}
	return {c:c, d:d}
}

/* MANAGERS & WATCHERS */
class EventManager {
	constructor() {
		this.subs = {};
	}
	sub(e, fn){
		if(this.subs[e]){
			this.subs[e].push(fn);
		}
		else{
			this.subs[e] = [fn];
		}
	}
	dis(e, data){
		if(this.subs[e]){
			this.subs[e].forEach(function(fn){
				fn(data);
			});
		}
	}
}
let eventManager = new EventManager();

class KeyWatcher {
	constructor() {
		this.gR = false;
		this.gL = false;
		this.gU = false;
		this.gD = false;
		this.SP = false;
		this.kSp = 32;
		this.kR = 39;
		this.kL = 37;
		this.kU = 38;
		this.kDa = 40;
		this.kE = 13;

		this.allowEnter = false;
		this.playing = false;
		this.gameOver = false;

		this.keyDownListener = this.handleKeyDown.bind(this);
		this.keyUpListener = this.handleKeyUp.bind(this);

		document.addEventListener('keydown', this.keyDownListener);
		document.addEventListener('keyup', this.keyUpListener);

		eventManager.sub(eventIDs.OVER, () => this.handleGameOver());
		eventManager.sub(eventIDs.NEXT, () => this.allowEnter = true);
		eventManager.sub(eventIDs.COMP, () => this.stopWatching());
		eventManager.sub(eventIDs.STRT, () => this.startWatching());
	}

	startWatching() {
		this.resetAllActions();
		this.playing = true;
	}

	stopWatching() {
		this.resetAllActions();
		this.allowEnter = false;
		this.playing = false;
	}
	
	resetAllActions() {
		this.gR = false;
		this.gL = false;
		this.gU = false;
		this.gD = false;
		this.SP = false;
	}

	handleGameOver() {
		this.stopWatching();
		this.gameOver = true;
		this.allowEnter = true;
	}

	handleKeyDown(e) {
		if(!this.playing) return;

		if(e.keyCode === this.kR) {
			this.gR = true;
		}
		if(e.keyCode === this.kL) {
			this.gL = true;
		}
		if(e.keyCode === this.kU) {
			this.gU = true;
		}
		if(e.keyCode === this.kDa) {
			this.gD = true;
		}
		if(e.keyCode === this.kSp) {
			this.SP = true;
		}
	}

	handleKeyUp(e) {
		if(this.gameOver) {
			this.gameOver = false;
		}
		if(!this.playing && this.allowEnter) {
			if(e.keyCode === this.kE) {
				eventManager.dis(eventIDs.ENT);
			}
		}
		else {
			if(e.keyCode === this.kR) {
				this.gR = false;
			}
			if(e.keyCode === this.kL) {
				this.gL = false;
			}
			if(e.keyCode === this.kU) {
				this.gU = false;
			}
			if(e.keyCode === this.kDa) {
				this.gD = false;
			}
			if(e.keyCode === this.kSp) {
				this.SP = false;
			}
		}
	}
}
let keyWatcher = new KeyWatcher();

class CollisionManager {
	constructor({enemies, missile, ship}) {
		this.ship = ship;
		this.m = missile;
		this.eS = enemies;

		this.running = false;

		eventManager.sub(eventIDs.COMP, () => this.stpTst());
		eventManager.sub(eventIDs.STRT, () => this.srtTst());
	}

	srtTst() { this.running = true; }

	stpTst() { this.running = false; }
	
	tstHit({objA, objB, radius}) {
		const dx = objA.x - objB.x;
		const dy = objA.y - objB.y;
		return Math.sqrt(dx*dx + dy*dy) < radius ? true : false
	}
	update() {
		if(!this.running) return;

		const mPt = {x:this.m.x, y:this.m.y};
		const sPt = {x:this.ship.sprite.x, y:this.ship.sprite.y};
		let ePt, dat;
		let hit = false;
		this.eS.eS.map((enemy, i) => {
			if(!enemy.alive) return;

			ePt = {x:enemy.sprite.x, y:enemy.sprite.y};
			dat = {x:ePt.x, y:ePt.y, type:explosions.t.m, value:enemy.variant, col:glows.hsl[enemy.variant-1]}

			// Test against missile
			if(this.m.active && ePt.x < width) {
				hit = this.tstHit({objA:mPt, objB:ePt, radius:34});
				if(hit){
					this.m.active = false;
					this.eS.killSprite(i);
					eventManager.dis(eventIDs.EXP, dat);
				}
			}
			// Test against ship
			hit = this.tstHit({objA:sPt, objB:ePt, radius:ship.shieldRadius});
			if(hit) {
				this.eS.killSprite(i);
				this.ship.takeDamage(1);
				dat.value = (enemy.variant);
				eventManager.dis(eventIDs.EXP, dat);
			}
		});
	}
}
/* MANAGERS & WATCHERS - END */

/* CONFIGS */
let explosions = { //explosions
	t:{
		m: 'm',
		s: 's'
	}
}
let glows = {
	colours: ['silver', 'yellowgreen', 'darkorange', 'firebrick', 'deeppink'],
	hsl: ['0,80%,100%', '130,100%,50%','240,100%,60%','60,100%,50%','15,100%,50%']
}
let rocketFlameColour = [
	'hsla(0,70%,60%,.2)',
	'hsla(45,70%,60%,.2)',
	'hsla(190,70%,60%,.2)',
	'hsla(310,70%,60%,.2)'
]
let ship = {
	dl:0,
	dead:false,
	health:0,
	shieldRadius:40,
	aF:{
		status: true,
		state: 0, // 0/1
		steps: 30, // Equates to speed - bigger slower,
		tolerance: 1, // How close is 'Arrived'
		dest:[
			{x:120, y:140}, // Flying in
			{x:1000, y:90} // Flying off
		]
	}
}
/* CONFIGS - END */


/* CLASSES */
// Death line - Game over if an enemy crosses here
class DeathLine {
    update() { return; }
    draw() {
        ctx.setLineDash([15, 9]);
        ctx.strokeStyle = 'hsl(200,80%,30%)';
		ctx.beginPath();
		ctx.arc(-873, 150, 999, -1, 1);
		ctx.stroke();
    }
}
class UI {
	constructor() {
		this.levelEl = document.querySelector('.lv');
		this.messageEl = document.querySelector('.msg');
		this.scoreEl = document.querySelector('.sc');
		this.gameSpace = document.querySelector('.gS');
		this.shieldEl = document.querySelector('.sh');

		this.run = false;
		this.wait = false;

		this.msg1 = true;
		this.mCount = 0;
		this.mgsS = [
			`You are pilot of <span class=b>Death's Hand</span>, your species last hope against the endless Skull Swarms<br><br>The ship can only shoot one missile at a time, so fight in the jaws of Skull death!<br><br>You can Ram, but shields take damage<br><br>Good Hunting!`,
			`There is only one rule. You fight. If you don't do your job, you die! Welcome to the <span class=b>Death's Hand</span>!`,
			`Come on. Do you wanna live forever?`,
			`In war you can only live once. Keep fighting. To the death`,
			`I suggest you take your victory and move on. More Skulls incoming`,
			`Some say that a Live-and-let-live policy is preferable to war with the Skulls. I say kill them all!`,
			`Yes, you're tired. Yes, there is no relief. Yes, the Skulls keep coming after us time after time after time.<br>Do your job!`,
			`These Skulls invented murder. Invented killing for sport, greed, envy. Ending them is the one true art form`,
			`You can sleep when you're dead, c'mon!`,
			`These Skulls are like a cancer that needs to be removed.`,
			`The rhythm of these shots is played in harmony with a greater plan. It's time to do your part and defend the planet`,
			`When you're paid to kill it doesn't pay to be polite. Kill those Skull f***ers!`,
			`When you are in the cockpit, you are in control. All you can do now is wait and hope you didn't make any mistakes`
		];
		this.pad = '<br><br>(Press Enter to continue)'
		this.gameOver = `You're dead<br>Play again?`;

		eventManager.sub(eventIDs.ENT, () => this.handleStart());
		eventManager.sub(eventIDs.EXP, (data) => this.handleExplode(data));
		eventManager.sub(eventIDs.OVER, () => this.handleGameOver());
		eventManager.sub(eventIDs.NEXT, () => this.handleReady());
		eventManager.sub(eventIDs.COMP, () => this.handleLevelOver());
	}

	handleReady() {
		this.wait = true;
		let m = this.msg1 ? this.mgsS[0] : this.mgsS[++this.mCount];
		if(this.mCount === this.mgsS.length-1) this.mCount = 0;
		this.setMessage(`${m}${this.pad}`);
		this.levelEl.innerHTML = ++gameLevel;
		this.shieldEl.innerHTML = maxShipHealth
		this.scoreEl.innerHTML = score;
		this.msg1 = false;
		this.run = true;
	}

	handleStart() {
		if(!this.run && !this.wait) {
			this.reset()
			return;
		}
		this.toggleCursor({hide:true});
		eventManager.dis(eventIDs.STRT);
		this.wait = false;
		this.setMessage('');
	}

	handleLevelOver() {
		this.toggleCursor({hide:false});
		this.setMessage(`Skull Swarm ${gameLevel} destroyed`);
	}

	handleExplode(data) {
		if(!data.value) return;
		score += data.value * 1;
		this.scoreEl.innerHTML = score;
	}

	handleGameOver() {
		this.toggleCursor({hide:false});
		this.setMessage(`${this.gameOver}${this.pad}`);
		this.run = false;
	}

	setMessage(message) {
		this.messageEl.innerHTML = message;
	}

	toggleCursor({hide}) {
		hide ? this.gameSpace.classList.add('playing') : this.gameSpace.classList.remove('playing');
	}

	reset() {
		gameLevel = 0;
		score = 0;
		chompRate = maxChompRate;
		this.levelEl.innerHTML = gameLevel;
		this.scoreEl.innerHTML = score;
		this.run = true;
		this.msg1 = true;
		eventManager.dis(eventIDs.RST);
		this.handleReady();
	}
}

class SpriteData {
	constructor(){
		this.e2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEQAAAAeCAMAAACi2EgRAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAsdQTFRFAAAAAAAAAAAAAAAAAAAAAAAA/wD/AAAA/wD/AAAAAAAAAP//AAAA/////////////////////wAA////AAAAAAAAAAAA////////AAAAAAAA////AAAAAAAAAAAA////AAAAAAAA////AAAA+Pj4/Pz8////AAAAAAAA5eXl////AAAA////nJycnJyc9PT0+/v7////AAAA////3t7en5+fnJycnJycnJycnJyc1tbW////AAAAAAAAAAAAs7OznJycnJycnJycnJycAAAAmpqaAAAA////nJycnJycnJyc9/f3AAAAAAAAtLS0oaGhp6enAAAA////////4ODg39/f////AAAA////////8/Pz9vb2AAAA////////AAD/////////AAAA/v7++vr7ICAgHBwcAP8A/wD/////////////AAAAAAAA/wD/AQEBBAQEhISEvb29Jycno6Oh7Ozr////////////////AAAAAAAAAAAA////Ozs7Ly8vLi4uHx8fKyss8fHybGxqxsbGgoKCAAAA////////////nZ2d4eHht7e3oqKj5OTm//98iIgxAgKA////////AP8A/wD///////////////////////8AAAD/////AAAA////JAAkCQkJPz9AQkJCAAAYt7f9////AAAAAAAAAAAA/////v7+AAAAUVFTV1dYSkpMxMRg/v4ACwuS/Pz8////////////////////AAAAAAD/AAAAAAAA3d3frKyuERETEhITaGhqAAAAKysyAAD4AAAA////////AAAAAAAATU1NAAAAubm6////AAAAq6us////////////////AAAA////////////////////////AAAAAAAA////AAAAAAAAAAAA////////////AAAA////////////////AAAA////////9bA3xAAAAO10Uk5TAP8EK2ewwaGUc0oMNsXM6v7/7rAzD5f4YGz+8UIKyNkXRXhe//+nCLf/0jL3GBH///YGt/8xDBAOI//9FQGZ/xUDCCJHFjX7CgIl/y+mKQ1IBzLz//+7LoBk//8foKQG5/An/////wKA9eGlVAJ0/////////9GZNgwDMWV7/////////74STPReBEb////////8XQpX6/z5gYuF///tGAmD//////ExCxu23sD6///////9wAFLSJuqf/wOfv//////+9mRPm+0V9L//e3UtLi8ThUaHXCus4xoOhwsBq99BRMrDgnJiNNKWallzg35ZgAAAmlJREFUeJyd1fVfFEEUAPD3sBX1RlQUPDFOMc7gPBNPbGw9E/vgLNCz8wzs7sLA7u4AW+xubMWuP8KZ2cXbZecDjO+HnfnsfPdN7i6AJhD8cuTMlTtP3nz5C4AwshLojwULFTYRJYoEFP0PUaw4a0E1aC2whLSAkkEMqL2wGgaXkhXm0vQ+0QQ1IWXkBJRFveCqnJyA8rwbSwUdqSgnQitxglhZS6pICahq5UterTobcQ2sqZAwm4wAqGWvXaduPaiPDWiTXZk8hjeUEo5GEdgYoEnTZqghpLletMhUQMtIxFataaUNMtFWJe1kBLTnx6dDx068G7syZQxzyojOXVA5hUrRtRsi3UrsLiOgR7juICHrit6JkhEAPf8RXvZC7E2Xvo+UgL68ib+dPttPTvR3odoFM+q7Hh2jF263KgYMHCQQg4fwh5VlYzA2zhUydJhHQ4bTRgsVI0aSUaPHjB0XO37CxEle7UAmW5UMPBEhrimhkCG8Uy3TSPz0GeieGYFk1uw5czMKmBdJfIuG8xfAQgNZtFgBS3DpsuUrVq5abRBr1iasWx+1YWMwTZK4afOWrQYB27bvoClMpp1uWuzavccowG/vPnp1mPezwRww24zCefAQ4mE8cpSQY8dPnHSeEmQBz+kzZ5OS6Zc88VyyqP38BSQXL5HLV/BqyrXrNxwC4rx5K5okKB+dAK8AANy+E3Q35d79Bw8fPX7yVJQDYgLTjwiJeybMAc9fpKa+fPX6zdt3tvdikf4nMX34mCYWND59Tvti3DZffP3GZ2L9Lp5KNsOfjeTHT0/WMrP49Tvpj2Bnsxd/AWIIskAz0D83AAAAAElFTkSuQmCC';
		this.ship = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGYAAABDCAMAAABZYIDVAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAsdQTFRFAAAAAAAAAAAA/wD/AAAAAAAAAAAA////////////////AAAAAAAAAAAAAAAA////AP8A//8A////AAAAAAD//wAAAP//AP//AAAAAAAAAAAA/wD/////AAAAAAAAAAAAAAAA////AAAA////AAAAAAAAAAAAAAAAAAAAAAAAAP8A////AAAAAAAA////AAAA////AAAA////////////AAAA////AAAA////////////AP8AAP//////AP//AAAAAAAAAAAA////////AAAAAAAA////////AAAAAAAA////AAAAAAAAAAAA////////AAAAAAAAAAAAAAAAAAAAAAAA////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////////AAAAAAAAAAAA////AAAAAAAAAAAA////////AAD/AAAA////////AAAA////AAAAAAAA////////AAAA////AAAAWlpa////////AAAA/v7+////////WFhY////AAAAAAAALCwsAAAAAAAA2traBQUFAgIC////HBwc////AAAAAAAA////4+PjUlJSAAAA/////Pz8UVFR////////AAAA//////8A////AAAA//////////////////////////8A////AAAAAAAA////////////////////////////////////AAAA////////////////////////////////////////////////////////////////////////AAAA//////////////////////////////////////////8A////////////AAAA////////////////////////////////////AAAA////////////////////AAAA//8A////////////////////////////AAAAdNT2aAAAAO10Uk5TAAhmj/z+/+muamY6BRl/////yin////ndhPj/8I1S1eRFIelBp/xMzItmduBj8AUR4iZ4+Ekk07FfoKalH+Vs6+3g2dYFvjXzMtxAgt68s3BhmEjYHnR6vzetnRjPQ08otH90pk3Z+ixJiz63ylw4LFoKedW9tBI8Cf/9xxd/zPM/40xrf8uRP///6j/a0zC2v//Dpb//1PuAWFlvC/dyXb+54RT5jYg1K99NI/zvnpjEZrI3O2fTmWM+UHx2Hw1+8SmShhZYFpkXXecXFRfSENWtg979S49Oz6jdaoMUbW5EoYKF4UnxqF5b0QHHgr0GAAABRxJREFUeJy9mAdjFUUQgC+nLLKg807uYrknasSCDY0tYgui8SFRFJXEjmBHfYqiUVFOwAr2io08sIGgEYyJ2GLFElFs2HvXH+Hu3m25vX0FvXOS3NtcmW9mdnZm71mWKnX2eusPQAM3GITtwUOsjGTDjQByAICQg8jHxoOGZgCxiWqqnR5cr54NNtl0s3QhQzdHxAvyixgKPDLwcwjyW6RJGUZMD/Wr4tNzW6ZH2cpIYRFE+a3TojSEFGQkoW2Gp0PZlugasB0qA0KwfTqYHRqiwYgddzKA0M7pYFTZJQlCu45Mn2PlE8mAdssAY+DsngWmTuegxiwwxJ//BzNijxgH7blXNpy94xjYJxsM1jBN+47ab/8DDjyoefTBY8ZgjG37kENTwNjxJKB12/eQxyp4WCtaDisUxjYfju1h4/41pfWIcoUUUKwgkfGR4wtHHY0nHLOuiGOPK0xsq0AxWYDajy8UTjjxpJNPqYlxqj3ptHYzQvpS9jpMbpsy9nT7jCqQM0e3lbFWYHgjryRnFc627XPKQc6dNLWatQiV6UlJOa8w6nwj5gKAcqGPg2rjePXFCy8yYJqZmmpPGzB+yNfPk/SHpmkJzMU1mIgM3vg5H3xkMJHeWrykTsOwOyt7gwzeULCfMyQHArLXQ9MvvSyBkbciIardhgxhs+n5CAyY8Kdjgkq5nJsGcf8liEQnmWlh8nnhE1donoecK2comKuEDQiiIDiIPyAuCWeu1s6xQxyDuD/FVkYYObMhCIooMs4hF3xmixvlTxQPU6kRhpALObgmiWG/swhk9pyieEAvjVHQpMEaxnX43LPT18YxUud11vWTyWsGn2rT8hQZiBL5fAPf20fP3chjSeSmKBTEEgBszZg7BeSLgGmVyxeSxLKR0xLRJGYejxg93EyiNnzmLbcGtwGfG8O2U4lo7PLtfOstgiHlDhWDeaLdeZcMvwljnhskCkM0RXeLS/eIQJDDvSKhsUwmAyZCJIMWXUouz3lKUO+bH8eoQVMyTrhv5EiaZhz5owmA4H65PB9wIVYaFeuUuUkuHAQgl5eOcTz6+aB0xnoo58fVJEZGDPc62QiEucXY656YT1E0oxtdpKwb49wlGfRkLhwU4z3n4UQniHCOkpq1dU9X4S7QOlunWIbIMZV0c0IZhBrGbHSgtHCR1tWsR6KQiRWnBk9U0EoYpUOxj0eb8GM6xXpcGs/rJV/gsg6bd1B6BySj0hOLlzyZYFBZmnyQh0oEj/YJUF3VOyy9ZdnEp57uesbIYCt0+YpnDUbG1XlanuiT0h0819NaFsEj14ufD4KV5aLPxTOcK5UWBvlF+IVqCClzywMcTTe8+FIQBCsWv4x7u16pncBkgaa7Y2BL+8pSXyn6d+p0aO9Y1j0+ePW1Lvz6G+uoXEidRmnpHfzmW6vefqcX41nvvrcE97+PV3/Q8+H86poqyppwNp0oq+Gjj/+jQrMspYnvso0NWwMZva9T3aQtuGGWAnySCWUVbUfgEkr4heenn2VBWRtSgFLq6f4nk5h93hLFjHFozL7IgLK2L1YbiTNf6m8oKUgjxCswgvS+UeXy1dc8tyIGTeiedHQ3hv3tm2+/Ew6E4XLZYHU6FGuaVhqZcrfeBbbZ//6HlDCkzfDaKxuL4wOrAT/+lBrFsn7+JSxiytw7Lp2X/hQhVIbgPpDbGc9jk5//NWUKkXH9LM0ch7xTebR3Lc8AEkrrGow7O7t/+/2PP//6O13V/wCX8UexY4V/jQAAAABJRU5ErkJggg==';
	}
}
class SpriteSimple {
	constructor({spriteData, h, w, x=0, y=0, active=false}) {
		this.active = active;
		this.image = null;
		this.oX = 0;
		this.speed = 1;
		this.speedX = 3;
		this.speedY = 2;
		this.spH = h;
		this.spW = w;
		this.x = x;
		this.y = y;

		this.spritesheetData = spriteData;
		this.createSprite();
	}
	
	// Create an image and populate it with spritesheet data
	createSprite() {
		this.image = new Image();
		this.image.src = this.spritesheetData;
	}
	
	// Stops sprite being checked in main game
	kill() { this.active = false; }
	// Allows sprite to be checked in main game once again
	recycle() { this.active = true; }
	
	// Draw current sprite frame into supplied canvas context
	// See MDN docs for reference: 
		// https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
	draw() {
		ctx.drawImage(this.image,
			this.oX,
			0,
			this.spW,
			this.spH,
			this.x - (this.spW * .5), // So the middle of the sprite is in the requested position
			this.y - (this.spH * .5), // So the middle of the sprite is in the requested position
			this.spW, 
			this.spH);
	}
}

class Ship {
	constructor() {
		this.sprite = new SpriteSimple({spriteData:spDat.ship, w:102, h:67, x:-200, y:90, active:true });
		this.rocketFlames = new RocketFlames();
		this.tik=0;

		eventManager.sub(eventIDs.OVER, () => this.explodeShip());
		eventManager.sub(eventIDs.COMP, () => this.stopUserControl());
		eventManager.sub(eventIDs.RST, () => this.reset());
		eventManager.sub(eventIDs.STRT, () => this.startUserControl());
	}

	startUserControl() {
		this.reset();
		ship.aF.status = false;
	}

	stopUserControl() {
		ship.aF.status = true;
	}

	takeDamage(damage=1) {
		if (ship.aF.status) return;

		ship.health -= damage;
		if (ship.health === 1) {
			ship.dl = 4;
		}
		if (ship.health < 3) {
			ship.dl = 3;
		} else if (ship.health < 8) {
			ship.dl = 2;
		} else {
			ship.dl = 1;
		}
		if(ship.health === 0) {
			eventManager.dis(eventIDs.OVER);
		}
	}

	explodeShip() {
		if(ship.dead) return; 

		ship.dead = true;
		eventManager.dis(eventIDs.EXP, {x:this.sprite.x, y:this.sprite.y, type:explosions.t.s});
		this.sprite.x = -200;
		this.sprite.y = 90;
		this.sprite.speedX = 3;
		this.sprite.speedY = 2;
		maxShipHealth = 11;
	}

	reset() {
		ship.dl = 1;
		ship.health = maxShipHealth;
		ship.dead = false;
	}

	powerup() {
		this.sprite.speedX = this.sprite.speedX < 5 ? 3 + gameLevel * .1 : 5;
		this.sprite.speedY = this.sprite.speedY < 3 ? 2 + gameLevel * .05 : 3;

		maxShipHealth = maxShipHealth < 20 ? 11 + mathFloor(gameLevel / 3) : 20;
	}

	update() {
		if(ship.dead) return;

		this.tik += .01;

		if(ship.aF.status) {
			this.remoteFly();
			return;
		}

		// Update sprite position and direction based on keys pressed
		if(keyWatcher.gU) this.sprite.y -= this.sprite.speedY;
		if(keyWatcher.gD) this.sprite.y += this.sprite.speedY;
		if(keyWatcher.gL) this.sprite.x -= this.sprite.speedX;
		if(keyWatcher.gR) this.sprite.x += this.sprite.speedX;

		if(keyWatcher.SP) {
			eventManager.dis(eventIDs.FIRE, {x:this.sprite.x + 46, y:this.sprite.y - 2});
		};

		// Keep in bounds
		if(this.sprite.y < 35) { this.sprite.y = 35 }
		if(this.sprite.y > 265) { this.sprite.y = 265 }
		if(this.sprite.x < 75) { this.sprite.x = 75 }
		if(this.sprite.x > 650) { this.sprite.x = 650 }

		this.rocketFlames.update({x:this.sprite.x, y:this.sprite.y});
	}

	remoteFly() {
		const nextX = (ship.aF.dest[ship.aF.state].x - this.sprite.x) / ship.aF.steps;
		const nextY = (ship.aF.dest[ship.aF.state].y - this.sprite.y) / ship.aF.steps;

		this.sprite.x += nextX;
		this.sprite.y += nextY;
		this.rocketFlames.update({x:this.sprite.x, y:this.sprite.y});

		/**
		 * When close enough,
		 * if flying in, stop auto,
		 * if flying off, start fly in.
		 */
		if(nextX < ship.aF.tolerance && nextY < ship.aF.tolerance) {
			if(ship.aF.state === 0) {
				ship.aF.status = false;
				ship.aF.state = 1;
				this.powerup();
				eventManager.dis(eventIDs.NEXT);
			}
			else {
				ship.dl = 0;
				this.sprite.x = -200;   
				this.sprite.y = 90;
				ship.aF.state = 0;
			}
		}
	}

	draw(){
		if(ship.dead) return;
		
		ctx.shadowBlur = 20;
		ctx.shadowColor = glows.colours[ship.dl];
		this.sprite.draw();
		this.rocketFlames.draw();
		
		ship.shieldRadius = ship.health > 1 ? 71 - ((maxShipHealth - ship.health) * 3) : 40;
		if(ship.health > 1){
			ctx.strokeStyle = glows.colours[ship.dl];
			ctx.beginPath();
			ctx.arc(this.sprite.x, this.sprite.y, ship.shieldRadius, -this.tik, Tau - this.tik);
			ctx.stroke();
		}

		ctx.shadowBlur = 0;
	}
}
class RocketFlames {
	constructor() {
		this.x = 0;
		this.y = 0;
	}
	update({x, y}) {
		this.x = x;
		this.y = y;
	}

	draw() {
		let rfX = this.x - 42;
		let rfY = this.y + 6.5;

		for(let i=0; i<6; i++)
		{
			ctx.beginPath();
			ctx.fillStyle = rocketFlameColour[mathFloor(mathRandom()*4)];
			ctx.moveTo(rfX, rfY);
			ctx.lineTo(rfX, rfY - 14);
			ctx.lineTo(rfX - (mathRandom() * 20 + 12), 
							rfY - (mathRandom() * 10 + 2));
			ctx.fill();
		}
	}
}
class Enemies {
	constructor() {
		this.eS = [];
		this.running = false;

		eventManager.sub(eventIDs.OVER, () => this.stopRunning());
		eventManager.sub(eventIDs.NEXT, () => this.prepLevel());
		eventManager.sub(eventIDs.RST, () => this.resetGame());
		eventManager.sub(eventIDs.STRT, () => this.startRunning());
	}

	startRunning() {
		this.running = true;
	}

	stopRunning() {
		this.running = false;
	}

	resetGame() {
		this.prepLevel();
	}

	prepLevel() {
		let formation = getLevelPattern();

		// Skulls chomp faster as game progresses
		chompRate = (chompRate > minChompRate) ? maxChompRate - gameLevel : minChompRate;

		const level = {
			speed: 1 + gameLevel*.01, // Enemies speed up as game progresses
			...formation};
		this.eS = [];
		level.r.map((r, i) => {
			const slots = r.split('');
			slots.map((slot, j) => {
				if(slot !== '0') {
					this.addSprite(
						{
							x: 750 + (j * 50), // baseX + horizontal spacing
							y: 68 + (i * 40), // baseY + vertical spacing
							speed: level.speed,
							v: slot
						}
					);
				}
			})
		});
	}

	addSprite({ x, y, speed, v}) {
		this.eS.push(
		{
			sprite: new SpriteSimple({
				spriteData:spDat.e2,
				w:34,
				h:30,
				x: x,
				y: y
			}),
			alive: true,
			speed: speed,
			variant: v,
			tick: 0,
			face: 0,
			health: v
		});
	}

	killSprite(id) {
		this.eS[id].health--;
		if(this.eS[id].health <= 0) {
			this.eS[id].alive = false;
		}
		this.eS[id].variant--;
		if(this.eS.filter(e => e.alive).length <= 0) {
			this.stopRunning();
			eventManager.dis(eventIDs.COMP);
		}
	}

	update() {
		this.eS.map(e => {

			if(e.tick++ % chompRate === 0){
				e.sprite.oX = e.face ? 0 : 34;
				e.face = !e.face;
			}
			if(!e.alive || !this.running) return;

			e.sprite.x -= e.speed;
			if(e.sprite.x <= 120) {
				eventManager.dis(eventIDs.OVER);
			}
		});
	}

	draw() {
		ctx.shadowBlur = 20;
		ctx.save();
		this.eS.map((e) => {
			if(!e.alive) return;
			
			ctx.shadowColor = `hsl(${glows.hsl[e.variant-1]})`;
			e.sprite.draw();

			// Colourize the enemy sprites
			ctx.globalAlpha = 0.6;
			ctx.globalCompositeOperation = 'source-atop';
			ctx.fillStyle = `hsl(${glows.hsl[e.variant-1]})`;
			ctx.fillRect(e.sprite.x - 17, e.sprite.y - 15, 34, 30);
			ctx.globalCompositeOperation = 'source-over'; // 
			ctx.globalAlpha = 1;
		});
		ctx.restore();
		ctx.shadowBlur = 0;
	}
}
class Missile {
	constructor() {
		this.speed = 8;
		this.radius = 6;
		this.active = false;
		this.max = width;
		this.x = -1000;
		this.y = 0;
		this.h = 4;
		this.w = 20;

		eventManager.sub(eventIDs.FIRE, (data) => {
			if(this.active) return;

			this.x = data.x;
			this.y = data.y;
			this.active = true;
		})
	}

	kill() {
		this.active = false;
	}

	update() {
		if(!this.active) return;

		this.x += this.speed;
		if(this.x >= this.max){
			this.active = false;
			this.x = -1000;
		}
	}

	draw() {
		if(!this.active) return;
		
		ctx.shadowBlur = 3;
		ctx.shadowColor = '#f44';
		ctx.fillStyle = '#333';
		ctx.fillRect(this.x, this.y, this.w, this.h);
		ctx.shadowBlur = 0;
	}
}
class Explosion {
	constructor() {
		this.x;
		this.y;
		this.explosions = [];
		this.active = false;

		eventManager.sub(eventIDs.EXP, (data) => this.explode(data));
	}

	explode(data) {
		let recycled = false;
		if(this.explosions.length > 0) {
			this.explosions.map( exp => {
				if(!recycled && exp.count <= 0) {
					this.recycleExplosion(exp, data);
					recycled = true;
				}
			})
		} 
		if(!recycled) {
			this.createNewExplosion(data);
		}
		this.active = true;
	}

	recycleExplosion(exp, data) {
		const {type, x, y, col} = data;
		exp.count = type === explosions.t.s ? 30 : 15;
		exp.size = 0;
		exp.type = type;
		exp.x = x;
		exp.y = y;
		exp.col = col;
	}

	createNewExplosion(data) {
		const {type, x, y, col} = data;
		this.explosions.push(  
			{
				count: type === explosions.t.s ? 30 : 15,
				size: 0,
				type: type,
				x: x,
				y: y,
				col: col
			}
		)
	}

	update() {
		if(this.explosions.filter(exp => exp.count > 0).length <= 0){
			this.active = false;
			return;
		}

		this.explosions.map(exp => {
			exp.count--;
			exp.size += exp.type === explosions.t.s ? 1.2 : .7;
		});
	}

	draw() {
		if(!this.active) return;

		this.explosions.map(exp => {
			if(exp.count > 0) {
				ctx.fillStyle = ctx.strokeStyle = (exp.type === explosions.t.s) ?
					`hsla(10,70%,60%,${1 - exp.size*.02})` : // Ship
					`hsla(${exp.col},${.7 - exp.size*.02})`; // Skull

				ctx.beginPath();
				ctx.arc(exp.x, exp.y, exp.size, 0, Tau);
				ctx.fill();
				ctx.beginPath();
				ctx.arc(exp.x, exp.y, exp.size*2, 0, Tau);
				ctx.stroke();
			}
		});
	}
}
class Stars {
	constructor() {
		this.stars = [];
		this.l = 1;
		this.warp = 0;
		eventManager.sub(eventIDs.COMP, () => this.warp = 1);
		eventManager.sub(eventIDs.NEXT, () => {this.warp = 0; this.l = 1});

		for(let i=0; i<200; i++){
			this.stars.push({
				x:mathRandom()*width,
				y:mathRandom()*height
			});
		}
	}
	update() {
		// Lightspeed effect
		if(this.warp === 1){
			this.l *= 1.2;
		}
		if(this.l > 130){
			this.warp = 0;
		}
		if(this.l > 1 && this.warp === 0){
			this.l *= .95;
		}

		this.stars.forEach(s => {
			s.x -= .2;
			if(s.x < 0){
				s.x = width;
				s.y = mathRandom()*height;
			}
		})
	}
	draw() {
		ctx.fillStyle = '#ddd';
		this.stars.forEach(s => {
			ctx.beginPath();
			ctx.fillRect(s.x, s.y, this.l, .75);
		})
	}

}
/***
CLASSES - END
***/


/***
MAIN 
***/
let ctx;
let height = 300;
let width = 720;
let maxShipHealth = 11;
let collisionManager, explosion, ui;
const renderQueue = [];
let loaded = false;
let spDat = new SpriteData();
let score = 0;
let maxChompRate = 30;
let minChompRate = 9;
let chompRate;
let gameLevel = 0;

const createCanvas = () => {
	let c = document.querySelector('canvas');
	c.width = width;
	c.height = height;
	ctx = c.getContext('2d');
}

const init = () => {
	if(loaded) return;
	loaded = true;
	
	createCanvas();
	const enmySt = new Enemies();
	const mslSt = new Missile();
	const shp = new Ship();

	// Need to build render queue back to front for layering
	renderQueue.push(new Stars());
	renderQueue.push(new DeathLine());
	renderQueue.push(enmySt);
	renderQueue.push(shp);
	renderQueue.push(mslSt);

	collisionManager = new CollisionManager({enemies:enmySt, missile:mslSt, ship:shp});
	explosion = new Explosion();
	ui = new UI();

	run();
}

const update = () => {
	renderQueue.map(gameElement => gameElement.update());
	collisionManager.update();
	explosion.update();
}

const draw = () => {
	ctx.clearRect(0, 0, width, height);
	renderQueue.map(gameElement => gameElement.draw());
	explosion.draw();
}

const run = () => {
	update();
	draw();
	requestAnimationFrame(run);
}

init();
