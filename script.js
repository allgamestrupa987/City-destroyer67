"use strict";

/* =========================================
   CANVAS
========================================= */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d", { alpha: false });

let W = 0;
let H = 0;

/* =========================================
   CONFIGURAÇÃO
========================================= */

const WORLD_WIDTH = 4200;
const GROUND_HEIGHT = 80;
const BUILDING_COUNT = 42; // Ajustado para 42 prédios/casas

/* =========================================
   ESTADO
========================================= */

let running = false;
let score = 0;
let bomberCount = 10;
let rocketCount = 100;
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
const rockets = [];
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
    speed: 350,
    health: 100,
    facing: 1, // 1 para direita, -1 para esquerda
    punching: false,
    punchTimer: 0,
    attackCooldown: 0,
    bombCooldown: 0,
    rocketCooldown: 0,
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

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

/* =========================================
   MENU
========================================= */

document.getElementById("startButton").addEventListener("click", startGame);

document.getElementById("restartButton").addEventListener("click", () => {
    location.reload();
});

/* =========================================
   TECLADO
========================================= */

window.addEventListener("keydown", event => {
    keys[event.code] = true;

    if (!running) return;

    if (event.code === "Space") {
        event.preventDefault();
        attack();
    }

    if (event.code === "KeyF") {
        fireRocket();
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
});

window.addEventListener("keyup", event => {
    keys[event.code] = false;
});

/* =========================================
   INICIAR JOGO
========================================= */

function startGame() {
    document.getElementById("menu").style.display = "none";
    document.getElementById("hud").style.display = "flex";
    document.getElementById("tip").style.display = "block";

    score = 0;
    bomberCount = 10;
    rocketCount = 100;
    player.health = 100;
    player.x = 250;

    createBuildings();

    bombs.length = 0;
    rockets.length = 0;
    bombers.length = 0;
    monsters.length = 0;
    explosions.length = 0;

    updateHUD();

    running = true;
    lastTime = performance.now();

    requestAnimationFrame(loop);
}

/* =========================================
   CRIAR CIDADE (42 EDIFÍCIOS)
========================================= */

function createBuildings() {
    buildings.length = 0;

    let x = 100;

    for (let i = 0; i < BUILDING_COUNT; i++) {
        const house = Math.random() < 0.4;

        let width, height;

        if (house) {
            width = 45 + Math.random() * 35;
            height = 45 + Math.random() * 35;
        } else {
            width = 65 + Math.random() * 65;
            height = 120 + Math.random() * 200;
        }

        buildings.push({
            id: i,
            x: x,
            width: width,
            height: height,
            health: 100,
            maxHealth: 100,
            destroyed: false,
            house: house,
            roofColor: "#a33222",
            color: house ? "#c28d59" : randomBuildingColor()
        });

        x += width + 22 + Math.random() * 30;
    }
}

/* =========================================
   CORES DE PRÉDIOS
========================================= */

function randomBuildingColor() {
    const colors = [
        "#4d5964",
        "#596570",
        "#626c76",
        "#47515b",
        "#707982"
    ];

    return colors[Math.floor(Math.random() * colors.length)];
}

/* =========================================
   SPAWNAR MONSTRO ALIADO
========================================= */

function spawnMonster() {
    if (player.monsterCooldown > 0) return;

    player.monsterCooldown = 1.5;

    monsters.push({
        x: player.x,
        width: 90,
        height: 95,
        speed: 90,
        health: 200,
        maxHealth: 200,
        attackDamage: 80
    });
}

/* =========================================
   ATUALIZAÇÃO
========================================= */

function update(dt) {
    updatePlayer(dt);
    updateBombs(dt);
    updateRockets(dt);
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
        player.facing = -1;
    }
    if (keys["KeyD"] || keys["ArrowRight"]) {
        direction += 1;
        player.facing = 1;
    }

    player.x += direction * player.speed * dt;
    player.x = Math.max(20, Math.min(WORLD_WIDTH - 20, player.x));

    if (player.attackCooldown > 0) player.attackCooldown -= dt;
    if (player.bombCooldown > 0) player.bombCooldown -= dt;
    if (player.rocketCooldown > 0) player.rocketCooldown -= dt;
    if (player.monsterCooldown > 0) player.monsterCooldown -= dt;

    /* Animação do soco */
    if (player.punching) {
        player.punchTimer -= dt;
        if (player.punchTimer <= 0) {
            player.punching = false;
        }
    }
}

/* =========================================
   CÂMERA
========================================= */

function updateCamera() {
    cameraX = player.x - W * 0.35;
    cameraX = Math.max(0, Math.min(WORLD_WIDTH - W, cameraX));
}

/* =========================================
   ATAQUE DIRETO (SOCO)
========================================= */

function attack() {
    if (player.attackCooldown > 0) return;

    player.attackCooldown = 0.25;
    player.punching = true;
    player.punchTimer = 0.18; // Duração da animação do soco

    const attackRange = 125;

    for (const building of buildings) {
        if (building.destroyed) continue;

        const buildingCenter = building.x + building.width / 2;

        if (Math.abs(buildingCenter - player.x) < (attackRange + building.width / 2)) {
            building.health -= 45;

            if (building.health <= 0) {
                destroyBuilding(building);
            }
        }
    }
}

/* =========================================
   LANÇAR FOGUETE
========================================= */

function fireRocket() {
    if (rocketCount <= 0 || player.rocketCooldown > 0) return;

    player.rocketCooldown = 0.2;
    rocketCount--;

    rockets.push({
        x: player.x,
        y: 0,
        targetY: H - GROUND_HEIGHT,
        speed: 800
    });
}

/* =========================================
   SOLTAR BOMBA
========================================= */

function dropBomb() {
    if (player.bombCooldown > 0) return;

    player.bombCooldown = 0.8;

    bombs.push({
        x: player.x,
        y: 100,
        speed: 450
    });
}

/* =========================================
   CHAMAR BOMBARDEIRO
========================================= */

function callBomber() {
    if (bomberCount <= 0) return;

    bomberCount--;

    bombers.push({
        x: player.x - 900,
        y: 80,
        speed: 600,
        dropsLeft: 3,
        nextDropX: player.x - 300
    });
}

/* =========================================
   ATUALIZAR FOGUETES
========================================= */

function updateRockets(dt) {
    for (let i = rockets.length - 1; i >= 0; i--) {
        const rocket = rockets[i];

        rocket.y += rocket.speed * dt;

        if (rocket.y >= rocket.targetY) {
            createExplosion(rocket.x, rocket.targetY, 130);
            rockets.splice(i, 1);
        }
    }
}

/* =========================================
   ATUALIZAR BOMBAS
========================================= */

function updateBombs(dt) {
    for (let i = bombs.length - 1; i >= 0; i--) {
        const bomb = bombs[i];

        bomb.y += bomb.speed * dt;

        if (bomb.y >= H - GROUND_HEIGHT) {
            createExplosion(bomb.x, H - GROUND_HEIGHT, 115);
            bombs.splice(i, 1);
        }
    }
}

/* =========================================
   ATUALIZAR AVIÕES
========================================= */

function updateBombers(dt) {
    for (let i = bombers.length - 1; i >= 0; i--) {
        const bomber = bombers[i];

        bomber.x += bomber.speed * dt;

        if (bomber.dropsLeft > 0 && bomber.x >= bomber.nextDropX) {
            bombs.push({
                x: bomber.x,
                y: bomber.y + 25,
                speed: 400
            });

            bomber.dropsLeft--;
            bomber.nextDropX += 300;
        }

        if (bomber.x - cameraX > W + 300) {
            bombers.splice(i, 1);
        }
    }
}

/* =========================================
   ATUALIZAR MONSTROS
========================================= */

function updateMonsters(dt) {
    for (let i = monsters.length - 1; i >= 0; i--) {
        const monster = monsters[i];

        monster.x += monster.speed * dt;

        for (const building of buildings) {
            if (building.destroyed) continue;

            const buildingCenter = building.x + building.width / 2;

            if (Math.abs(buildingCenter - monster.x) < (building.width / 2 + 30)) {
                building.health -= monster.attackDamage * dt;

                if (building.health <= 0) {
                    destroyBuilding(building);
                }
            }
        }

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

    for (const building of buildings) {
        if (building.destroyed) continue;

        const center = building.x + building.width / 2;

        if (Math.abs(center - x) < radius + building.width / 2) {
            building.health -= 100;

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
   DESTRUIR PRÉDIO / CASA
========================================= */

function destroyBuilding(building) {
    if (building.destroyed) return;

    building.destroyed = true;
    building.health = 0;

    score += building.house ? 80 : 150;

    createExplosion(
        building.x + building.width / 2,
        H - GROUND_HEIGHT - 20,
        50
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
    drawRockets();
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
   CIDADE E CASAS
========================================= */

function drawCity() {
    const bottom = H - GROUND_HEIGHT;

    for (const building of buildings) {
        const x = building.x - cameraX;

        if (x + building.width < -50 || x > W + 50) continue;

        if (building.destroyed) {
            drawDestroyed(building, x, bottom);
            continue;
        }

        const y = bottom - building.height;

        if (building.house) {
            ctx.fillStyle = building.color;
            ctx.fillRect(x, y, building.width, building.height);

            const roofHeight = building.width * 0.55;
            ctx.fillStyle = building.roofColor;
            ctx.beginPath();
            ctx.moveTo(x - 5, y);
            ctx.lineTo(x + building.width / 2, y - roofHeight);
            ctx.lineTo(x + building.width + 5, y);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = "#4a2c11";
            ctx.fillRect(x + building.width / 2 - 5, y + building.height - 18, 10, 18);

            ctx.fillStyle = "#ffe07b";
            ctx.fillRect(x + 6, y + 10, 10, 10);
            ctx.fillRect(x + building.width - 16, y + 10, 10, 10);

        } else {
            ctx.fillStyle = building.color;
            ctx.fillRect(x, y, building.width, building.height);

            drawWindows(x, y, building.width, building.height);
        }

        if (building.health < building.maxHealth) {
            ctx.fillStyle = "#202020";
            ctx.fillRect(x, y - 10, building.width, 5);

            ctx.fillStyle = "#ef4848";
            ctx.fillRect(
                x,
                y - 10,
                Math.max(0, building.width * (building.health / building.maxHealth)),
                5
            );
        }
    }
}

/* =========================================
   JANELAS
========================================= */

function drawWindows(x, y, width, height) {
    const columns = Math.max(2, Math.floor(width / 24));
    const rows = Math.max(2, Math.floor(height / 35));

    ctx.fillStyle = "#e6ca6b";

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
            ctx.fillRect(
                x + 6 + col * 22,
                y + 10 + row * 32,
                9,
                15
            );
        }
    }
}

/* =========================================
   PRÉDIO DESTRUÍDO
========================================= */

function drawDestroyed(building, x, bottom) {
    const height = Math.max(10, building.height * 0.2);

    ctx.fillStyle = "#34383b";
    ctx.fillRect(x, bottom - height, building.width, height);
}

/* =========================================
   CHÃO
========================================= */

function drawGround() {
    const ground = H - GROUND_HEIGHT;

    ctx.fillStyle = "#344d38";
    ctx.fillRect(0, ground, W, GROUND_HEIGHT);

    ctx.fillStyle = "#25282b";
    ctx.fillRect(0, ground + 10, W, 55);

    ctx.fillStyle = "#e1cf5b";
    const offset = -cameraX % 90;

    for (let x = offset; x < W; x += 90) {
        ctx.fillRect(x, ground + 35, 45, 5);
    }
}

/* =========================================
   JOGADOR COM ANIMAÇÃO DE BRAÇOS
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
    if (player.facing === 1) {
        ctx.fillRect(x + 22, y + 8, 8, 8);
        ctx.fillRect(x + 42, y + 8, 8, 8);
    } else {
        ctx.fillRect(x + 14, y + 8, 8, 8);
        ctx.fillRect(x + 34, y + 8, 8, 8);
    }

    /* Boca */
    ctx.fillRect(x + 19, y + 28, 29, 6);

    /* --- BRAÇOS E ANIMAÇÃO DE SOCO --- */
    ctx.fillStyle = "#4ec437";

    const punchExtension = player.punching ? 32 : 0;

    if (player.facing === 1) {
        // Braço Traseiro (Esquerdo)
        ctx.fillRect(x - 2, y + 30, 12, 28);

        // Braço Dianteiro (Direito com Animação de Soco)
        ctx.fillRect(x + 48, y + 30, 12 + punchExtension, 16);
        ctx.fillStyle = "#8aff63";
        ctx.fillRect(x + 56 + punchExtension, y + 27, 12, 22); // Punho
    } else {
        // Braço Traseiro (Direito)
        ctx.fillRect(x + 56, y + 30, 12, 28);

        // Braço Dianteiro (Esquerdo com Animação de Soco)
        ctx.fillRect(x + 8 - punchExtension, y + 30, 12 + punchExtension, 16);
        ctx.fillStyle = "#8aff63";
        ctx.fillRect(x - 2 - punchExtension, y + 27, 12, 22); // Punho
    }
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

        ctx.fillStyle = "#303942";
        ctx.fillRect(x, y, 100, 18);

        ctx.fillStyle = "#4b5660";
        ctx.fillRect(x + 15, y - 12, 65, 40);

        ctx.fillStyle = "#79c5dd";
        ctx.fillRect(x + 68, y + 3, 20, 8);
    }
}

/* =========================================
   BOMBAS E FOGUETES (FOGUETE MAIS FINO E PONTA TRIANGULAR)
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

function drawRockets() {
    for (const rocket of rockets) {
        const x = rocket.x - cameraX;
        const y = rocket.y;

        // Corpo fino do foguete (retângulo fino)
        ctx.fillStyle = "#d1d5db";
        ctx.fillRect(x - 2.5, y - 20, 5, 20);

        // Ponta em triângulo maior que o corpo
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(x - 8, y);
        ctx.lineTo(x + 8, y);
        ctx.lineTo(x, y + 14); // Apontado para baixo
        ctx.closePath();
        ctx.fill();

        // Fogo/Aleta no topo
        ctx.fillStyle = "#f97316";
        ctx.fillRect(x - 3, y - 26, 6, 6);
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
    const alive = buildings.filter(b => !b.destroyed).length;

    document.getElementById("health").textContent = Math.max(0, Math.floor(player.health));
    document.getElementById("score").textContent = score;
    document.getElementById("buildings").textContent = alive;
    document.getElementById("rockets").textContent = rocketCount;
    document.getElementById("bombers").textContent = bomberCount;
}

/* =========================================
   LOOP
========================================= */

function loop(time) {
    if (!running) return;

    const dt = Math.min((time - lastTime) / 1000, 0.033);
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
    const msgElem = document.getElementById("gameOverMessage");

    if (isWin) {
        titleElem.textContent = "PARABÉNS!";
        titleElem.style.color = "#4dff4d";
        msgElem.innerHTML = `Você destruiu toda a cidade!<br>Pontuação Final: <strong id="finalScore">${score}</strong>`;
    } else {
        titleElem.textContent = "FIM DE JOGO";
        titleElem.style.color = "#ff4b4b";
        msgElem.innerHTML = `Pontuação Final: <strong id="finalScore">${score}</strong>`;
    }

    document.getElementById("gameOver").style.display = "flex";
}