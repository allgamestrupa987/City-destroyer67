"use strict";


/* =========================================
   CANVAS
========================================= */

const canvas =
    document.getElementById("gameCanvas");

const ctx =
    canvas.getContext("2d", {
        alpha: false
    });


let W = 0;
let H = 0;


/* =========================================
   CONFIGURAÇÃO
========================================= */

const WORLD_WIDTH = 5000;

const GROUND_HEIGHT = 80;

const BUILDING_COUNT = 70;


/* =========================================
   ESTADO
========================================= */

let running = false;

let score = 0;

let bomberCount = 10;

let cameraX = 0;

let lastTime = 0;


/* =========================================
   INPUT
========================================= */

const keys = {};


/* =========================================
   OBJETOS
========================================= */

const buildings = [];

const bombs = [];

const bombers = [];

const monsters = [];

const explosions = [];


/* =========================================
   JOGADOR
========================================= */

const player = {

    x: 250,

    width: 64,

    height: 105,

    speed: 330,

    health: 100,

    attackCooldown: 0,

    bombCooldown: 0,

    monsterCooldown: 0

};


/* =========================================
   RESIZE
========================================= */

function resizeCanvas() {

    W = window.innerWidth;

    H = window.innerHeight;

    canvas.width = W;
    canvas.height = H;

    updatePlayerPosition();
}


window.addEventListener(
    "resize",
    resizeCanvas
);


resizeCanvas();


/* =========================================
   MENU
========================================= */

document
    .getElementById("startButton")
    .addEventListener(
        "click",
        startGame
    );


document
    .getElementById("restartButton")
    .addEventListener(
        "click",
        () => {
            location.reload();
        }
    );


/* =========================================
   TECLADO
========================================= */

window.addEventListener(
    "keydown",
    event => {

        keys[event.code] = true;

        if (!running)
            return;

        if (event.code === "Space") {
            event.preventDefault();
            attack();
        }

        if (event.code === "KeyB") {
            dropBomb();
        }

        if (event.code === "KeyR") {
            callBomber();
        }

        if (event.code === "KeyM") {
            spawnMonster();
        }

    }
);


window.addEventListener(
    "keyup",
    event => {
        keys[event.code] = false;
    }
);


/* =========================================
   INICIAR
========================================= */

function startGame() {

    document
        .getElementById("menu")
        .style.display = "none";

    document
        .getElementById("hud")
        .style.display = "flex";

    document
        .getElementById("tip")
        .style.display = "block";

    createBuildings();

    monsters.length = 0;

    updateHUD();

    running = true;

    lastTime = performance.now();

    requestAnimationFrame(loop);
}


/* =========================================
   CRIAR CIDADE
========================================= */

function createBuildings() {

    buildings.length = 0;

    let x = 50;

    for (let i = 0; i < BUILDING_COUNT; i++) {

        const width = 55 + Math.random() * 70;

        const height = 100 + Math.random() * 220;

        const house = Math.random() < 0.25;

        buildings.push({

            x: x,

            width: width,

            height: height,

            health: 100,

            maxHealth: 100,

            destroyed: false,

            house: house,

            color: house ? "#bd8050" : randomBuildingColor()

        });

        x += width + 18 + Math.random() * 35;
    }
}


/* =========================================
   CORES
========================================= */

function randomBuildingColor() {

    const colors = [
        "#4d5964",
        "#596570",
        "#626c76",
        "#47515b",
        "#707982"
    ];

    return colors[
        Math.floor(Math.random() * colors.length)
    ];
}


/* =========================================
   SPAWNAR MONSTRO ALIADO
========================================= */

function spawnMonster() {

    if (player.monsterCooldown > 0)
        return;

    player.monsterCooldown = 1.5;

    monsters.push({
        x: player.x,
        width: 90,
        height: 95,
        speed: 80,
        health: 200,
        maxHealth: 200,
        attackDamage: 50
    });
}


/* =========================================
   ATUALIZAÇÃO
========================================= */

function update(dt) {

    updatePlayer(dt);

    updateBombs(dt);

    updateBombers(dt);

    updateMonsters(dt);

    updateExplosions(dt);

    updateCamera();

    updateHUD();

    checkWinCondition();

    if (player.health <= 0) {
        gameOver(false);
    }
}


/* =========================================
   VERIFICAR VITÓRIA
========================================= */

function checkWinCondition() {

    const remainingBuildings = buildings.filter(b => !b.destroyed).length;

    if (remainingBuildings === 0) {
        gameOver(true);
    }
}


/* =========================================
   JOGADOR
========================================= */

function updatePlayer(dt) {

    let direction = 0;

    if (keys["KeyA"] || keys["ArrowLeft"]) {
        direction -= 1;
    }

    if (keys["KeyD"] || keys["ArrowRight"]) {
        direction += 1;
    }

    player.x += direction * player.speed * dt;

    player.x = Math.max(
        20,
        Math.min(WORLD_WIDTH - 20, player.x)
    );

    if (player.attackCooldown > 0) {
        player.attackCooldown -= dt;
    }

    if (player.bombCooldown > 0) {
        player.bombCooldown -= dt;
    }

    if (player.monsterCooldown > 0) {
        player.monsterCooldown -= dt;
    }
}


/* =========================================
   CÂMERA
========================================= */

function updateCamera() {

    cameraX = player.x - W * 0.35;

    cameraX = Math.max(
        0,
        Math.min(WORLD_WIDTH - W, cameraX)
    );
}


/* =========================================
   ATAQUE
========================================= */

function attack() {

    if (player.attackCooldown > 0)
        return;

    player.attackCooldown = 0.3;

    const attackRange = 110;

    /* Prédios */
    for (const building of buildings) {

        if (building.destroyed)
            continue;

        const distance = Math.abs(
            (building.x + building.width / 2) - player.x
        );

        if (distance < attackRange) {

            building.health -= 35;

            if (building.health <= 0) {
                destroyBuilding(building);
            }
        }
    }
}


/* =========================================
   BOMBA
========================================= */

function dropBomb() {

    if (player.bombCooldown > 0)
        return;

    player.bombCooldown = 1;

    bombs.push({
        x: player.x,
        y: 150,
        speed: 400
    });
}


/* =========================================
   BOMBARDEIRO
========================================= */

function callBomber() {

    if (bomberCount <= 0)
        return;

    bomberCount--;

    bombers.push({
        x: player.x - 900,
        y: 100,
        speed: 600,
        dropsLeft: 3, // Solta 3 bombas durante o voo
        nextDropX: player.x - 300
    });
}


/* =========================================
   ATUALIZAR BOMBAS
========================================= */

function updateBombs(dt) {

    for (let i = bombs.length - 1; i >= 0; i--) {

        const bomb = bombs[i];

        bomb.y += bomb.speed * dt;

        if (bomb.y >= H - GROUND_HEIGHT) {

            createExplosion(
                bomb.x,
                H - GROUND_HEIGHT,
                115
            );

            bombs.splice(i, 1);
        }
    }
}


/* =========================================
   AVIÕES
========================================= */

function updateBombers(dt) {

    for (let i = bombers.length - 1; i >= 0; i--) {

        const bomber = bombers[i];

        bomber.x += bomber.speed * dt;

        if (bomber.dropsLeft > 0 && bomber.x >= bomber.nextDropX) {

            bombs.push({
                x: bomber.x,
                y: bomber.y + 25,
                speed: 350
            });

            bomber.dropsLeft--;
            bomber.nextDropX += 300; // Define o ponto para soltar a próxima bomba
        }

        if (bomber.x - cameraX > W + 300) {
            bombers.splice(i, 1);
        }
    }
}


/* =========================================
   MONSTROS (DESTRUINDO PRÉDIOS E CASAS)
========================================= */

function updateMonsters(dt) {

    for (let i = monsters.length - 1; i >= 0; i--) {

        const monster = monsters[i];

        monster.x += monster.speed * dt;

        /* Ataca o prédio ou casa mais próximo no seu caminho */
        for (const building of buildings) {

            if (building.destroyed)
                continue;

            const buildingCenter = building.x + building.width / 2;

            if (Math.abs(buildingCenter - monster.x) < (building.width / 2 + 20)) {

                building.health -= monster.attackDamage * dt;

                if (building.health <= 0) {
                    destroyBuilding(building);
                }
            }
        }

        /* Se o monstro sair do mapa, é removido */
        if (monster.x > WORLD_WIDTH + 200) {
            monsters.splice(i, 1);
        }
    }
}


/* =========================================
   EXPLOSÃO
========================================= */

function createExplosion(x, y, radius) {

    explosions.push({
        x: x,
        y: y,
        radius: radius,
        life: 0.35
    });

    /* Destruir prédios */
    for (const building of buildings) {

        if (building.destroyed)
            continue;

        const center = building.x + building.width / 2;

        if (Math.abs(center - x) < radius + building.width / 2) {

            building.health -= 90;

            if (building.health <= 0) {
                destroyBuilding(building);
            }
        }
    }
}


/* =========================================
   ATUALIZAR EXPLOSÕES
========================================= */

function updateExplosions(dt) {

    for (let i = explosions.length - 1; i >= 0; i--) {

        explosions[i].life -= dt;

        if (explosions[i].life <= 0) {
            explosions.splice(i, 1);
        }
    }
}


/* =========================================
   DESTRUIR PRÉDIO
========================================= */

function destroyBuilding(building) {

    if (building.destroyed)
        return;

    building.destroyed = true;

    score += 100;

    createExplosion(
        building.x + building.width / 2,
        H - GROUND_HEIGHT - 30,
        65
    );
}


/* =========================================
   DESENHO
========================================= */

function draw() {

    drawSky();

    drawMountains();

    drawCity();

    drawGround();

    drawBombers();

    drawBombs();

    drawMonsters();

    drawPlayer();

    drawExplosions();
}


/* =========================================
   CÉU
========================================= */

function drawSky() {

    ctx.fillStyle = "#78b8e5";

    ctx.fillRect(0, 0, W, H);

    /* Sol */
    ctx.fillStyle = "#ffe49a";

    ctx.beginPath();
    ctx.arc(W - 100, 90, 45, 0, Math.PI * 2);
    ctx.fill();
}


/* =========================================
   MONTANHAS
========================================= */

function drawMountains() {

    ctx.fillStyle = "#687783";

    ctx.beginPath();
    ctx.moveTo(0, H - 220);

    for (let x = 0; x <= W; x += 100) {

        const y = H - 220 - Math.sin((x + cameraX * 0.15) * 0.008) * 55;

        ctx.lineTo(x, y);
    }

    ctx.lineTo(W, H);
    ctx.lineTo(0, H);

    ctx.fill();
}


/* =========================================
   CIDADE
========================================= */

function drawCity() {

    for (const building of buildings) {

        const x = building.x - cameraX;

        if (x + building.width < 0 || x > W)
            continue;

        const bottom = H - GROUND_HEIGHT;

        if (building.destroyed) {
            drawDestroyed(building, x, bottom);
            continue;
        }

        const y = bottom - building.height;

        /* Prédio */
        ctx.fillStyle = building.color;

        ctx.fillRect(
            x,
            y,
            building.width,
            building.height
        );

        /* Casa */
        if (building.house) {

            ctx.fillStyle = "#8e4545";

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + building.width / 2, y - 28);
            ctx.lineTo(x + building.width, y);
            ctx.fill();

            drawHouseWindows(x, y, building.width);

        } else {

            drawWindows(
                x,
                y,
                building.width,
                building.height
            );
        }

        /* Vida do prédio */
        if (building.health < 100) {

            ctx.fillStyle = "#202020";

            ctx.fillRect(x, y - 7, building.width, 4);

            ctx.fillStyle = "#ef4848";

            ctx.fillRect(
                x,
                y - 7,
                Math.max(0, building.width * (building.health / 100)),
                4
            );
        }
    }
}


/* =========================================
   JANELAS
========================================= */

function drawWindows(x, y, width, height) {

    const columns = Math.max(2, Math.floor(width / 27));

    const rows = Math.max(2, Math.floor(height / 40));

    ctx.fillStyle = "#e6ca6b";

    for (let row = 0; row < rows; row++) {

        for (let col = 0; col < columns; col++) {

            ctx.fillRect(
                x + 7 + col * 27,
                y + 12 + row * 40,
                10,
                17
            );
        }
    }
}


function drawHouseWindows(x, y, width) {

    ctx.fillStyle = "#ffe07b";

    ctx.fillRect(x + 12, y + 25, 15, 15);

    ctx.fillRect(x + width - 27, y + 25, 15, 15);
}


/* =========================================
   PRÉDIO DESTRUÍDO
========================================= */

function drawDestroyed(building, x, bottom) {

    const height = building.height * 0.25;

    ctx.fillStyle = "#34383b";

    ctx.fillRect(x, bottom - height, building.width, height);
}


/* =========================================
   CHÃO
========================================= */

function drawGround() {

    const ground = H - GROUND_HEIGHT;

    /* Gramado */
    ctx.fillStyle = "#344d38";

    ctx.fillRect(0, ground, W, GROUND_HEIGHT);

    /* Estrada */
    ctx.fillStyle = "#25282b";

    ctx.fillRect(0, ground + 10, W, 55);

    /* Faixas da estrada */
    ctx.fillStyle = "#e1cf5b";

    const offset = -cameraX % 90;

    for (let x = offset; x < W; x += 90) {

        ctx.fillRect(x, ground + 35, 45, 5);
    }
}


/* =========================================
   JOGADOR
========================================= */

function updatePlayerPosition() {

    player.y = H - GROUND_HEIGHT - player.height;
}


function drawPlayer() {

    const x = player.x - cameraX;

    const y = H - GROUND_HEIGHT - player.height;

    /* Pernas */
    ctx.fillStyle = "#31522c";

    ctx.fillRect(x + 13, y + 65, 14, 40);

    ctx.fillRect(x + 38, y + 65, 14, 40);

    /* Corpo */
    ctx.fillStyle = "#64d84c";

    ctx.fillRect(x + 8, y + 20, 50, 55);

    /* Cabeça */
    ctx.fillStyle = "#8aff63";

    ctx.beginPath();
    ctx.arc(x + 33, y + 15, 28, 0, Math.PI * 2);
    ctx.fill();

    /* Olhos */
    ctx.fillStyle = "#101010";

    ctx.fillRect(x + 17, y + 8, 8, 8);

    ctx.fillRect(x + 42, y + 8, 8, 8);

    /* Boca */
    ctx.fillRect(x + 19, y + 28, 29, 6);
}


/* =========================================
   MONSTROS ALIADOS
========================================= */

function drawMonsters() {

    for (const monster of monsters) {

        const x = monster.x - cameraX;

        const y = H - GROUND_HEIGHT - monster.height;

        ctx.fillStyle = "#a33dcc";

        ctx.fillRect(x, y, monster.width, monster.height);

        /* Olhos */
        ctx.fillStyle = "#ff4646";

        ctx.fillRect(x + 12, y + 15, 10, 10);

        ctx.fillRect(x + monster.width - 22, y + 15, 10, 10);
    }
}


/* =========================================
   AVIÕES
========================================= */

function drawBombers() {

    for (const bomber of bombers) {

        const x = bomber.x - cameraX;

        const y = bomber.y;

        /* Corpo */
        ctx.fillStyle = "#303942";

        ctx.fillRect(x, y, 100, 18);

        /* Asa */
        ctx.fillStyle = "#4b5660";

        ctx.fillRect(x + 15, y - 12, 65, 40);

        /* Cabine */
        ctx.fillStyle = "#79c5dd";

        ctx.fillRect(x + 68, y + 3, 20, 8);
    }
}


/* =========================================
   BOMBAS
========================================= */

function drawBombs() {

    ctx.fillStyle = "#171717";

    for (const bomb of bombs) {

        const x = bomb.x - cameraX;

        ctx.beginPath();
        ctx.arc(x, bomb.y, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ff8a2c";

        ctx.fillRect(x - 2, bomb.y - 13, 4, 8);

        ctx.fillStyle = "#171717";
    }
}


/* =========================================
   EXPLOSÕES
========================================= */

function drawExplosions() {

    for (const explosion of explosions) {

        const progress = explosion.life / 0.35;

        const radius = explosion.radius * (1 - progress * 0.35);

        ctx.globalAlpha = progress;

        ctx.fillStyle = "#ffbd32";

        ctx.beginPath();
        ctx.arc(
            explosion.x - cameraX,
            explosion.y,
            radius,
            0,
            Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = "#f04a20";

        ctx.beginPath();
        ctx.arc(
            explosion.x - cameraX,
            explosion.y,
            radius * 0.55,
            0,
            Math.PI * 2
        );
        ctx.fill();

        ctx.globalAlpha = 1;
    }
}


/* =========================================
   HUD
========================================= */

function updateHUD() {

    const alive = buildings.reduce(
        (total, building) => total + (building.destroyed ? 0 : 1),
        0
    );

    document.getElementById("health").textContent =
        Math.max(0, Math.floor(player.health));

    document.getElementById("score").textContent = score;

    document.getElementById("buildings").textContent = alive;

    document.getElementById("bombers").textContent = bomberCount;
}


/* =========================================
   LOOP
========================================= */

function loop(time) {

    if (!running)
        return;

    const dt = Math.min(
        (time - lastTime) / 1000,
        0.033
    );

    lastTime = time;

    update(dt);

    draw();

    requestAnimationFrame(loop);
}


/* =========================================
   GAME OVER / TELA DE VITÓRIA
========================================= */

function gameOver(isWin = false) {

    running = false;

    const titleElem = document.getElementById("gameOverTitle");

    if (isWin) {
        titleElem.textContent = "PARABÉNS!";
        titleElem.style.color = "#4dff4d";
    } else {
        titleElem.textContent = "FIM DE JOGO";
        titleElem.style.color = "#ff4b4b";
    }

    document.getElementById("finalScore").textContent = score;

    document.getElementById("gameOver").style.display = "flex";
}