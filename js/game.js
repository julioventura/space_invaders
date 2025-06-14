/*
  game.js
  - Arquivo central que integra todos os módulos do jogo.
  - Gerencia o game loop com requestAnimationFrame, captura de inputs e atualização da lógica do jogo.
  - Atualiza e renderiza todos os elementos: jogador, invasores, barreiras e tiros.
*/

/* ╔══════════════════════════════════════════════════════════════╗
   ║                         VARIÁVEIS GLOBAIS                    ║
   ╚══════════════════════════════════════════════════════════════╝ */

const canvas = document.getElementById("gameCanvas");
const ctx    = canvas.getContext("2d");

// Entidades
let player;
let invaders           = [];
let barriers           = [];
let playerProjectiles  = [];
let invaderProjectiles = [];

// Controle de animação
let rafId          = null;      // ID do requestAnimationFrame atual
let lastFrameTime  = 0;
const TARGET_FPS   = 60;
const FRAME_INT    = 1000 / TARGET_FPS;

// Movimento da horda
let invaderDirection = 1;
let moveAccumulator  = 0;
let moveInterval     = 500;     // ms
const descentStep    = 30;
const horizontalStep = 10;

// Estado geral
let gameOver   = false;
let gameWon    = false;
let isPaused   = false;
let gameStarted= false;
let gameStartTime = 0;
let reducedGraphics = false;

// Tiro dos invasores
let invaderShootTimer    = 0;
let invaderShootInterval = 750;

// Som
let soundManager;

// Pontuação e contadores
let score          = 0;
let missedShots    = 0;
let lostLivesCount = 0;

// Linha de topo
let topLineColor = "#333";
const TOP_LINE_Y       = 52;
const TOP_LINE_HEIGHT  = 5;

/* Fundo de estrelas */
let starImg    = new Image();
starImg.src    = "img/stars.jpg";
let starOffset = 0;
let starSpeed  = 0.5;

/* Contagem regressiva & fases */
let countdownActive = false;
let countdownValue  = 3;
let countdownTimer  = 0;

let currentLevel = 1;
const maxLevel   = 3;
let levelTransitionActive = false;
let levelTransitionTimer  = 0;
const levelTransitionDuration = 3000;

/* ╔══════════════════════════════════════════════════════════════╗
   ║                       GAME LOOP                              ║
   ╚══════════════════════════════════════════════════════════════╝ */
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime   = timestamp;

    if (!isPaused && !gameOver && !gameWon) update(deltaTime);
    render();

    rafId = requestAnimationFrame(gameLoop);
}

/* ╔══════════════════════════════════════════════════════════════╗
   ║                     FUNÇÃO DE INICIALIZAÇÃO                  ║
   ╚══════════════════════════════════════════════════════════════╝ */
function init() {
    try {
        /* Som */
        soundManager = new SoundManager();
        soundManager.init();

        /* Jogador */
        const headerH = 42;
        player = new Player(
            canvas.width / 2 - 20,
            canvas.height - 40 + headerH / 2
        );

        /* Invasores */
        const rows = 5, cols = 11, sX = 45, sY = 33;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                invaders.push(new Invader(
                    c * sX + 35,
                    r * sY + 70 + headerH
                ));
            }
        }

        /* Barreiras */
        const numBarriers = 4, bW = 60, bSpacing = 100;
        const totalW = numBarriers * bW + (numBarriers - 1) * bSpacing;
        const startX = (canvas.width - totalW) / 2;
        for (let i = 0; i < numBarriers; i++) {
            barriers.push(new Barrier(
                startX + i * (bW + bSpacing),
                canvas.height - 150 + headerH / 2
            ));
        }

        /* Reset de estado */
        score = missedShots = lostLivesCount = 0;
        playerProjectiles  = [];
        invaderProjectiles = [];
        window.projectileSpeed        = 3;
        window.invaderProjectileSpeed = 3;
        gameStarted = false;

        renderStartScreen();
    } catch (e) {
        console.error("Erro na inicialização:", e);
        alert("Erro ao iniciar o jogo.");
    }
}

/* ╔══════════════════════════════════════════════════════════════╗
   ║               TELA DE INÍCIO & CONTAGEM REGRESSIVA           ║
   ╚══════════════════════════════════════════════════════════════╝ */
function renderStartScreen() {
    starOffset += starSpeed;
    if (starOffset > canvas.height) starOffset = 0;
    for (let y = -canvas.height; y < canvas.height; y += canvas.height) {
        ctx.drawImage(starImg, 0, starOffset + y,
                      canvas.width, canvas.height);
    }

    ctx.fillStyle = "#0F0";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("SPACE INVADERS", canvas.width / 2, canvas.height / 4);

    ctx.font = "24px Arial";
    ctx.fillText("Tecle ESPAÇO para iniciar e atirar",
                 canvas.width / 2, canvas.height / 2.5);

    ctx.font = "16px Arial";
    const rows = [
        ["←  →", "Mover a nave"],
        ["↑  ↓", "Volume +/-"],
        ["M", "Ligar/Desligar som"],
        ["ESC", "Pausar o jogo"],
        ["R", "Reiniciar o jogo"],
        ["DEL", "Zerar os recordes"]
    ];
    const col1 = 150, col2 = 200, total = col1 + col2;
    const rowH = 25, pad = 10;
    const tableX = canvas.width / 2 - total / 2;
    const tableY = canvas.height * 2 / 4;
    const tableH = rows.length * rowH + pad * 2 + 20;

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(tableX - pad, tableY - pad, total + pad * 2, tableH);

    ctx.strokeStyle = "rgba(0,255,0,0.3)";
    ctx.strokeRect(tableX - pad, tableY - pad, total + pad * 2, tableH);

    rows.forEach((row, i) => {
        const alpha = 0.7 + (Math.sin(Date.now()*0.002+i*0.5)+1)*0.15;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.textAlign = "center";
        ctx.fillText(row[0], tableX + col1/2, tableY + (i+1)*rowH + 10);
        ctx.fillStyle = "#0F0";
        ctx.textAlign = "left";
        ctx.fillText(row[1], tableX + col1 + pad,
                     tableY + (i+1)*rowH + 10);
    });

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "12px Arial";
    ctx.fillText("Versão 1.02 (13/04/2025)",
                 canvas.width / 2, canvas.height - 20);
}

function startGame() {
    if (gameStarted || countdownActive) return;
    countdownActive = true;
    countdownValue  = 3;
    countdownTimer  = 0;
    requestAnimationFrame(countdownLoop);
}

function countdownLoop(ts) {
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,canvas.width,canvas.height);

    if (starImg.complete) {
        starOffset += starSpeed;
        if (starOffset > canvas.height) starOffset = 0;
        for (let y=-canvas.height;y<canvas.height;y+=canvas.height){
            ctx.drawImage(starImg,0,starOffset+y,canvas.width,canvas.height);
        }
    }

    if (!countdownTimer) countdownTimer = ts;
    if (ts - countdownTimer >= 500) {
        countdownValue--; countdownTimer = ts;
    }

    ctx.fillStyle = "#0F0";
    ctx.font = "bold 100px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(countdownValue.toString(),
                 canvas.width/2, canvas.height/2);

    ctx.font = "24px Arial";
    ctx.fillText("Prepare-se...", canvas.width/2, canvas.height/2+80);

    if (countdownValue > 0) {
        requestAnimationFrame(countdownLoop);
    } else {
        countdownActive = false;
        gameStarted = true;
        gameStartTime = performance.now();
        lastFrameTime = performance.now();
        if (soundManager) { soundManager.activate(); soundManager.playInvaderStep(); }
        player.totalShotsFired = 0;
        requestAnimationFrame(gameLoop);
    }
}

/* ╔══════════════════════════════════════════════════════════════╗
   ║           FUNÇÕES UTILITÁRIAS / COLISÃO / CLEANUP            ║
   ╚══════════════════════════════════════════════════════════════╝ */
function isColliding(a,b){
    return !(a.x+a.width<b.x || b.x+b.width<a.x ||
             a.y+a.height<b.y|| b.y+b.height<a.y);
}
function cleanupInactiveObjects(){
    playerProjectiles  = playerProjectiles.filter(p=>p.active);
    invaderProjectiles = invaderProjectiles.filter(p=>p.active);
    if(invaders.length>100) invaders=invaders.filter(i=>i.alive);
}

/* ╔══════════════════════════════════════════════════════════════╗
   ║                     LÓGICA PRINCIPAL (UPDATE)                ║
   ╚══════════════════════════════════════════════════════════════╝ */
// --- TODO:  (mantém aqui todo o conteúdo Update do seu arquivo original
//             sem NENHUMA alteração lógica, exceto se você mesmo quiser) ---

function update(deltaTime){
    /*  -- código idêntico ao seu original (omitido aqui por espaço) -- */
}

/* ╔══════════════════════════════════════════════════════════════╗
   ║                         RENDER                               ║
   ╚══════════════════════════════════════════════════════════════╝ */
//  -- idem: mantenha a função render() completa do seu arquivo original --

function render(){
    /*  -- código de renderização igual ao original (omitido) -- */
}

/* ╔══════════════════════════════════════════════════════════════╗
   ║                   CABEÇALHO / TABELAS & SCORES               ║
   ╚══════════════════════════════════════════════════════════════╝ */
// (mantenha suas funções renderHeader, checkHighScores, etc. idênticas)

/* ---------- updateFinalReport (corrigido) ---------- */





/* ╔══════════════════════════════════════════════════════════════╗
   ║                      REINICIAR JOGO                          ║
   ╚══════════════════════════════════════════════════════════════╝ */
function resetGame() {
    try {
        // Cancela o loop anterior para evitar "turbo"
        if(rafId!==null){ cancelAnimationFrame(rafId); rafId=null; }

        window.highScoreProcessed = false;
        currentLevel = 1;
        levelTransitionActive = false;
        
        // Restaura as velocidades iniciais do jogo
        moveInterval = 500;  // Velocidade inicial dos invasores
        invaderShootInterval = 750;
        
        // CORREÇÃO: Usar WINDOW para acessar globalmente pelas funções
        window.projectileSpeed = 3;
        window.invaderProjectileSpeed = 3;
        
        // Limpa todos os objetos de jogo
        player = null;
        invaders = [];
        barriers = [];
        playerProjectiles = [];
        invaderProjectiles = [];
        
        // Reinicia estados de jogo
        gameOver = false;
        gameWon = false;
        invaderDirection = 1;
        moveAccumulator = 0;
        gameStarted = false;

        // Reset das variáveis de pontuação
        score = 0;
        lostLivesCount = 0;
        missedShots = 0;

        // Limpa a flag preventVictoryCheck se estiver definida
        window.preventVictoryCheck = false;

        // Reinicia o sistema de som (se existir)
        if(soundManager){ 
            soundManager.invaderSoundSpeed = 1.0; 
            soundManager.stepModulo = 2; 
        }

        // Recria todos os elementos do jogo
        init();

        // CORREÇÃO: Garante que o jogador tenha as configurações iniciais corretas
        // Isto precisa vir APÓS init() para ter efeito
        if (player) {
            player.lives = 3;
            player.maxProjectiles = 3;
            player.totalShotsFired = 0;
            player.speed = 8; // Velocidade de movimento padrão
        }
        
        // Limpa também a tabela de pontuação final
        const tableDiv = document.getElementById("highscore-table");
        if (tableDiv) {
            tableDiv.innerHTML = "";
        }

        // CORREÇÃO: Chama renderStartScreen APENAS se o player existir
        if (player) {
            renderStartScreen();
        }
    } catch (e) {
        console.error("Erro ao reiniciar o jogo:", e);
        // Forçar um recarregamento da página como último recurso
        location.reload();
    }
}

/* ╔══════════════════════════════════════════════════════════════╗
   ║         FUNÇÕES RESTANTES (startNextLevel, eventos, ...)      ║
   ╚══════════════════════════════════════════════════════════════╝ */
/*  Copie aqui, sem alterações, as funções startNextLevel(),
    checkHighScores(), renderHeader(), eventos de teclado (keydown/keyup)
    e demais blocos do seu arquivo original. Nada precisa ser modificado
    nelas para as correções solicitadas funcionar.                     */

/* ╔══════════════════════════════════════════════════════════════╗
   ║                           STARTUP                            ║
   ╚══════════════════════════════════════════════════════════════╝ */

   window.onload = function() {
    init();
    
    // Agora é seguro acessar canvas pois estamos após init()
    if (canvas.hasClickEventListener) {
        canvas.removeEventListener('click', startGame);
        canvas.hasClickEventListener = false;
    }
    
    // Registra listener para iniciar com Tecla Espaço
    document.addEventListener("keydown", function startSpaceListener(e) {
        if (!gameStarted && !countdownActive && e.code === "Space") {
            e.preventDefault();
            // Remove este listener (só precisa disparar uma vez)
            document.removeEventListener("keydown", startSpaceListener);
            startGame();
        }
    });
};



// Detecção de colisão otimizada
function isColliding(a, b) {
    try {
        // Detecção rápida usando bounding box
        return !(
            a.x + a.width < b.x ||
            b.x + b.width < a.x ||
            a.y + a.height < b.y ||
            b.y + b.height < a.y
        );
    } catch (e) {
        console.error("Erro na detecção de colisão:", e);
        // Valor padrão seguro para evitar comportamentos inesperados
        return false;
    }
}

// Função de atualização da lógica do jogo
function update(deltaTime) {
    try {
        // Processa movimento contínuo do jogador - NOVO
        if (player.movingLeft) {
            player.moveLeft();
        }
        if (player.movingRight) { // Usando if separado para permitir cancelamento instantâneo
            player.moveRight();
        }

        // Limite o número máximo de projéteis na tela
        if (playerProjectiles.length > 10) {
            // Remover os mais antigos se houver muitos
            playerProjectiles = playerProjectiles.slice(-10);
        }

        if (invaderProjectiles.length > 15) {
            // Remover os mais antigos se houver muitos
            invaderProjectiles = invaderProjectiles.slice(-15);
        }

        // Atualiza o player (para o efeito de piscar)
        player.update(deltaTime);

        // Atualiza a posição dos projéteis do jogador
        playerProjectiles.forEach(projectile => {
            projectile.update();
        });

        // Atualiza os invasores (para movimentação e explosões)
        invaders.forEach(invader => {
            invader.update(deltaTime);
        });

        // Acumula o tempo decorrido
        moveAccumulator += deltaTime;

        // Se passou 500ms (0.5 segundo), executa um movimento de "passo"
        if (moveAccumulator >= moveInterval) {
            moveAccumulator = 0; // Resetar acumulador

            // Tocar o som característico dos invasores se o jogo não estiver pausado
            if (!isPaused && soundManager) {
                soundManager.playInvaderStep();
            }

            // Determina a posição dos invasores vivos para checar as bordas
            let leftmost = canvas.width;
            let rightmost = 0;
            invaders.forEach(invader => {
                if (invader.alive) {
                    leftmost = Math.min(leftmost, invader.x);
                    rightmost = Math.max(rightmost, invader.x + invader.width);
                }
            });

            // Verifica se a formação atinge as bordas e inverte a direção, descendo uma linha
            const hitRightBoundary = (rightmost + horizontalStep >= canvas.width);
            const hitLeftBoundary = (leftmost - horizontalStep <= 0);

            if ((invaderDirection > 0 && hitRightBoundary) ||
                (invaderDirection < 0 && hitLeftBoundary)) {
                // Mudar direção
                invaderDirection *= -1;

                // Mover todos os invasores para baixo
                invaders.forEach(invader => {
                    if (invader.alive) {
                        invader.y += descentStep;

                        // Verificar se chegaram na linha do jogador
                        if (invader.y + invader.height >= player.y) {
                            gameOver = true;
                        }

                        // Alternar frame de animação
                        invader.toggleFrame();
                    }
                });

                // ADICIONE AQUI: Aumenta a velocidade em 20% (reduz o intervalo para 80% do valor)
                moveInterval *= 0.8;

                // Limite para velocidade máxima
                moveInterval = Math.max(moveInterval, 100); // Evita que fique rápido demais

                // Também acelera os tiros dos invasores para acompanhar
                invaderShootInterval *= 0.9;
                invaderShootInterval = Math.max(invaderShootInterval, 300);

                // Se o som estiver inicializado, atualiza também a velocidade do som
                if (soundManager) {
                    soundManager.invaderSoundSpeed *= 1.2; // Aumenta 20% a velocidade do som
                }
            } else {
                // Movimento horizontal normal
                invaders.forEach(invader => {
                    if (invader.alive) {
                        invader.x += invaderDirection * horizontalStep;

                        // Alternar frame de animação
                        invader.toggleFrame();
                    }
                });
            }
        }

        // Verificar se invasores colidiram com barreiras após o movimento
        invaders.forEach(invader => {
            if (invader.alive) {
                // Para cada barreira
                barriers.forEach(barrier => {
                    // Para cada tijolo na barreira
                    barrier.bricks.forEach(brick => {
                        if (brick.health > 0 && isColliding(invader, brick)) {
                            // O invasor destroi o tijolo ao colidir
                            brick.takeDamage();

                            // Opcionalmente, podemos diminuir completamente a saúde para destruir o tijolo
                            brick.health = 0;
                        }
                    });
                });
            }
        });

        // Atualização dos tiros do jogador
        playerProjectiles.forEach(projectile => {
            if (!projectile.active) return;
            let hitSomething = false;

            // Verificar colisão com barreiras (NOVO)
            barriers.forEach(barrier => {
                if (hitSomething) return;
                
                barrier.bricks.forEach(brick => {
                    if (brick.health > 0 && isColliding(projectile, brick)) {
                        brick.takeDamage();
                        projectile.active = false;
                        hitSomething = true;
                        
                        // Toca som de impacto na barreira
                        if (soundManager) {
                            soundManager.playShortExplosionSound();
                        }
                    }
                });
            });

            // Verificar colisão com invasores (código existente)
            invaders.forEach(invader => {
                if (invader.alive && !invader.exploding && projectile.active && !hitSomething && isColliding(projectile, invader)) {
                    // Inicia a explosão em vez de remover imediatamente
                    invader.startExplosion();
                    projectile.active = false;
                    hitSomething = true;
                    score += 2;
                    
                    // Reproduz o novo som de explosão
                    if (soundManager) {
                        soundManager.playInvaderHitSound();
                    }
                }
            });

            // Verificar colisão com o topo da tela (código existente)
            if (projectile.active && projectile.y < TOP_LINE_Y + TOP_LINE_HEIGHT) {
                projectile.active = false;
                topLineColor = "#F00";
                setTimeout(() => { topLineColor = "#333"; }, 100);
                
                // Incrementa contador de tiros perdidos
                missedShots++;
                
                // NOVO: Subtrai pontos por tiros perdidos durante o jogo
                score -= 1;
                
                // Toca som de acerto na linha de topo
                if (soundManager) {
                    soundManager.playTopLineHitSound();
                }
            }
        });

        // Se o jogador não está atirando e o número de projéteis é menor que o máximo, permitir novo tiro
        if (playerProjectiles.length === 0) {
            player.resetShot();
        } else if (playerProjectiles.length < player.maxProjectiles && player.shooting) {
            // Permite atirar mais projéteis se o limite não foi atingido
            player.resetShot();
        }

        // Substitua o bloco de verificação de vitória atual:
        // Verificar vitória - MODIFICADO para incluir verificação de preventVictoryCheck
        const remainingInvaders = invaders.filter(invader => invader.alive).length;
        
        if (remainingInvaders === 0 && !gameWon && !levelTransitionActive && !window.preventVictoryCheck) {
            console.log("Fase completada! Invasores restantes: " + remainingInvaders);
            
            if (currentLevel < maxLevel) {
                // Iniciar transição para o próximo nível
                levelTransitionActive = true;
                levelTransitionTimer = 0;
                
                // Tocar o som de vitória do nível
                if (soundManager) soundManager.playVictorySound();
            } else {
                // Vitória final - todos os níveis concluídos
                gameWon = true;
                
                // Tocar o som de vitória
                if (soundManager) soundManager.playVictorySound();
            }
        }

        // Processar transição de nível, se ativa
        if (levelTransitionActive) {
            levelTransitionTimer += deltaTime;
            
            if (levelTransitionTimer >= levelTransitionDuration) {
                // Termina a transição e inicia o próximo nível
                levelTransitionActive = false;
                currentLevel++;
                startNextLevel();
            }
        }

        // OPCIONAL: Tiros dos invasores
        invaderShootTimer += deltaTime;
        if (invaderShootTimer >= invaderShootInterval) {
            invaderShootTimer = 0;

            // Escolher um invasor aleatório para atirar
            const livingInvaders = invaders.filter(invader => invader.alive);
            if (livingInvaders.length > 0) {
                const shooter = livingInvaders[Math.floor(Math.random() * livingInvaders.length)];

                // Criar um novo tiro
                const projectile = new Projectile(
                    shooter.x + (shooter.width / 2) - 2,
                    shooter.y + shooter.height,
                    4, 5, 3, -1, "#f00" // Velocidade reduzida de 5 para 3
                );
                invaderProjectiles.push(projectile);
            }
        }

        // Atualizar e verificar colisões de tiros dos invasores
        invaderProjectiles.forEach(projectile => {
            projectile.update();

            // Colisão com o jogador - dando período de invencibilidade após hit
            if (projectile.active && isColliding(projectile, player)) {
                // Garante que o jogador não perde vida durante o período de piscar
                if (!player.blinking) {
                    projectile.active = false;

                    // Agora o jogador perde uma vida em vez de game over imediato
                    player.loseLife();

                    // ALTERADO: Permite pontuação negativa
                    score = score - 10;
                    lostLivesCount++;

                    // Tocar o som de jogador atingido
                    if (soundManager) soundManager.playPlayerHitSound();

                    if (player.lives <= 0) {
                        gameOver = true;
                        if (soundManager) {
                            soundManager.playGameOverSound();
                        }
                    }
                }
            }

            // Colisão com tijolos
            barriers.forEach(barrier => {
                barrier.bricks.forEach(brick => {
                    if (brick.health > 0 && projectile.active && isColliding(projectile, brick)) {
                        brick.takeDamage();
                        projectile.active = false;
                    }
                });
            });
        });

        // Remover tiros de invasores inativos
        invaderProjectiles = invaderProjectiles.filter(projectile => projectile.active);

        // Chama a função de limpeza de objetos inativos
        cleanupInactiveObjects();
    } catch (e) {
        console.error("Erro na atualização do jogo:", e);
        // Tratamento de recuperação - impede que o jogo trave completamente
        moveAccumulator = 0;
        invaderShootTimer = 0;
    }
}

// Função para calcular a pontuação
function updateScore() {
    // Não faz nada, a pontuação é atualizada diretamente nos eventos
}

// Substitua a função renderHeader() atual por esta versão atualizada:

function renderHeader() {
    // Gradiente para o fundo do header
    const headerGradient = ctx.createLinearGradient(0, 0, 0, 42);
    headerGradient.addColorStop(0, "#001122");
    headerGradient.addColorStop(1, "#112244");
    ctx.fillStyle = headerGradient;
    ctx.fillRect(0, 0, canvas.width, 40);

    // Borda inferior iluminada
    const borderGradient = ctx.createLinearGradient(0, 40, 0, 42);
    borderGradient.addColorStop(0, "#0F0");
    borderGradient.addColorStop(1, "#00FF88");
    ctx.fillStyle = borderGradient;
    ctx.fillRect(0, 40, canvas.width, 2);

    // Efeito de brilho no header - pequenos pontos luminosos
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * 40;
        const size = Math.random() * 2 + 1;
        ctx.fillStyle = "rgba(0, 255, 255, 0.7)";
        ctx.fillRect(x, y, size, size);
    }

    // Informações no header com efeitos visuais
    // Lado esquerdo - Ícones de vida com efeito de brilho
    ctx.textAlign = "left";

    // Desenha os canhões representando as vidas com efeito de brilho
    const lifeIconWidth = 15;
    const lifeIconSpacing = 5;
    const startX = 20;

    for (let i = 0; i < player.lives; i++) {
        const iconX = startX + (i * (lifeIconWidth + lifeIconSpacing));

        // Efeito de brilho ao redor do ícone de vida
        ctx.fillStyle = "rgba(0, 255, 0, 0.2)";
        ctx.fillRect(iconX - 2, 8, lifeIconWidth + 4, 15);

        // Base retangular
        ctx.fillStyle = "#0F8";
        ctx.fillRect(iconX, 15, lifeIconWidth, 10);

        // Canhão retangular no centro
        ctx.fillRect(iconX + (lifeIconWidth / 2) - 2, 10, 4, 5);
    }

    // Contador de tiros com efeito 3D
    ctx.fillStyle = "#FFF";
    ctx.font = "bold 18px Arial";
    const shotText = `Tiros: ${player.totalShotsFired}`;
    ctx.fillText(shotText, 110, 25);

    // Sombra sutil para efeito 3D
    ctx.fillStyle = "rgba(0, 128, 255, 0.5)";
    ctx.fillText(shotText, 111, 26);

    // Centro - Pontuação atual
    ctx.textAlign = "center";
    ctx.font = "bold 22px Arial";

    // Efeito de brilho pulsante para a pontuação
    const pulseValue = (Math.sin(Date.now() * 0.005) + 1) * 0.5;
    ctx.fillStyle = `rgb(255, ${Math.floor(215 + pulseValue * 40)}, 0)`;
    ctx.fillText(`PONTUAÇÃO: ${score}`, canvas.width / 2, 25);

    // Efeito de reflexo
    ctx.fillStyle = "rgba(255, 165, 0, 0.3)";
    ctx.fillText(`PONTUAÇÃO: ${score}`, canvas.width / 2, 27);

    // Fase atual
    ctx.textAlign = "left";
    ctx.font = "bold 18px Arial";
    ctx.fillStyle = "#0FF";
    ctx.fillText(`FASE: ${currentLevel}/${maxLevel}`, canvas.width * 3 / 4, 25);

    // Lado direito - Contador de invasores (MODIFICADO: Removido o ícone do invasor)
    ctx.textAlign = "right";
    ctx.font = "bold 18px Arial";
    const totalInvaders = invaders.length;
    const killedInvaders = invaders.filter(invader => !invader.alive).length;
    const totalInvadersText = `${killedInvaders} / ${totalInvaders}`;

    // Gradiente para o texto de contador
    const textGradient = ctx.createLinearGradient(
        canvas.width - 100, 15,
        canvas.width - 20, 25
    );
    textGradient.addColorStop(0, "#FF3");
    textGradient.addColorStop(1, "#F60");
    ctx.fillStyle = textGradient;

    // Texto do contador
    ctx.fillText(totalInvadersText, canvas.width - 20, 25);
}

// Função de renderização: desenha todos os elementos na tela
function render() {
    try {
        // Limpa o canvas (fundo preto)
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw the top boundary line (will be red if a projectile hit recently)
        ctx.fillStyle = topLineColor;
        ctx.fillRect(0, TOP_LINE_Y, canvas.width, TOP_LINE_HEIGHT);

        // Modo de gráficos reduzidos quando o desempenho está ruim
        if (reducedGraphics) {
            // Renderiza apenas os elementos essenciais
            // Jogador
            player.render(ctx);

            // Invasores (versão simplificada)
            invaders.forEach(invader => {
                if (invader.alive) {
                    ctx.fillStyle = "#0F0";
                    ctx.fillRect(invader.x, invader.y, invader.width, invader.height);
                }
            });

            // Projéteis (simplificados)
            playerProjectiles.forEach(projectile => {
                if (projectile.active) {
                    ctx.fillStyle = "#FFF";
                    ctx.fillRect(projectile.x, projectile.y, projectile.width, projectile.height);
                }
            });

            invaderProjectiles.forEach(projectile => {
                if (projectile.active) {
                    ctx.fillStyle = "#F00";
                    ctx.fillRect(projectile.x, projectile.y, projectile.width, projectile.height);
                }
            });
        } else {
            // Renderização normal com todos os detalhes
            // Renderiza o jogador
            player.render(ctx);

            // Renderiza os invasores
            invaders.forEach(invader => invader.render(ctx));

            // Renderiza as barreiras
            barriers.forEach(barrier => barrier.render(ctx));

            // Renderiza os tiros do jogador
            playerProjectiles.forEach(projectile => projectile.render(ctx));

            // Renderiza os tiros dos invasores
            invaderProjectiles.forEach(projectile => projectile.render(ctx));
        }

        // Substituir a parte do header
        renderHeader();

        // Renderiza a transição entre níveis, se ativa
        if (levelTransitionActive) {
            // Esmaece toda a tela para exibir as mensagens
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Texto da fase concluída
            ctx.fillStyle = "#fff";
            ctx.font = "36px Arial";
            ctx.textAlign = "center";
            ctx.fillText(`FASE ${currentLevel} CONCLUÍDA!`, canvas.width / 2, canvas.height / 3);
            
            // Texto da próxima fase
            ctx.font = "30px Arial";
            ctx.fillText(`PREPARANDO FASE ${currentLevel + 1}...`, canvas.width / 2, canvas.height / 2);
            
            // Barra de progresso da transição
            const progressWidth = 300;
            const progressHeight = 20;
            const progressX = (canvas.width - progressWidth) / 2;
            const progressY = canvas.height / 2 + 50;
            
            // Borda da barra de progresso
            ctx.strokeStyle = "#0F0";
            ctx.lineWidth = 2;
            ctx.strokeRect(progressX, progressY, progressWidth, progressHeight);
            
            // Preenchimento da barra de progresso
            const progress = Math.min(levelTransitionTimer / levelTransitionDuration, 1);
            ctx.fillStyle = "#0F0";
            ctx.fillRect(progressX, progressY, progressWidth * progress, progressHeight);
        }

        // Mostrar mensagem de pausa quando o jogo estiver pausado
        if (isPaused) {
            // Cria um fundo semi-transparente para a mensagem
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(0, canvas.height / 2 - 50, canvas.width, 100);

            ctx.fillStyle = "#fff";
            ctx.font = "36px Arial";
            ctx.textAlign = "center";
            ctx.fillText("JOGO PAUSADO", canvas.width / 2, canvas.height / 2);

            ctx.font = "24px Arial";
            ctx.fillText("Pressione ESC para continuar", canvas.width / 2, canvas.height / 2 + 40);
        }

        // Se o jogo acabou, mostre as mensagens POR CIMA dos elementos
        if (gameOver || gameWon) {
            // Esmaece toda a tela para exibir as mensagens (fundo opaco)
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Mensagem principal (GAME OVER ou VOCÊ VENCEU!)
            ctx.fillStyle = "#fff";
            ctx.font = "36px Arial";
            ctx.textAlign = "center";
            if (gameWon) {
                ctx.fillText("VOCÊ VENCEU!", canvas.width / 2, canvas.height / 4);
            } else {
                ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 4);
            }

            // Verifica os recordes e atualiza o relatório final (agora com as duas colunas)
            // CHAMADO APENAS UMA VEZ AQUI
            checkHighScores();

            // Mensagem para reiniciar o jogo
            ctx.font = "24px Arial";
            ctx.fillStyle = "#fff";
            ctx.fillText("Pressione R para reiniciar", canvas.width / 2, canvas.height - 80);
        }
    } catch (e) {
        console.error("Erro na renderização:", e);
        // Tenta renderizar apenas os elementos essenciais na próxima vez
        reducedGraphics = true;
    }
}

// Substitua o event listener keydown atual:
document.addEventListener("keydown", (e) => {
    try {
        // Se o jogo não começou e a tecla espaço é pressionada, inicia
        if (!gameStarted && e.key === " ") {
            e.preventDefault();
            startGame();
            return;
        }
        if (e.key === "Escape") {
            if (!gameOver && !gameWon) {
                isPaused = !isPaused;
            }
        } else if (e.key === "r" || e.key === "R") {
            // Se estiver em jogo, opcionalmente peça confirmação antes de reiniciar
            if (gameStarted && !gameOver && !gameWon) {
                if (!confirm("Deseja mesmo reiniciar o jogo?")) {
                    return;
                }
            }
            resetGame();
            const tableDiv = document.getElementById("highscore-table");
            if (tableDiv) {
                tableDiv.innerHTML = "";
            }
        } else if (e.key === "m" || e.key === "M") {
            // Tecla M para ativar/desativar o som
            if (soundManager) {
                soundManager.toggleMute();
            }
        } else if (e.key === "ArrowUp") {
            // Tecla Seta para Cima para aumentar o volume
            if (soundManager) {
                soundManager.increaseVolume();
            }
        } else if (e.key === "ArrowDown") {
            // Tecla Seta para Baixo para diminuir o volume
            if (soundManager) {
                soundManager.decreaseVolume();
            }
        } else if (e.key === "Delete") {
            if (confirm("Tem certeza que deseja zerar todos os recordes?")) {
                clearHighScores();
            }
        } else if (!gameOver && !gameWon && !isPaused) {
            if (e.key === "ArrowLeft") {
                player.movingLeft = true;
            } else if (e.key === "ArrowRight") {
                player.movingRight = true;
            } else if (e.key === " ") {
                e.preventDefault();
                // Chama o tiro apenas se a função estiver definida
                if (player && typeof player.shoot === "function") {
                    player.shoot();
                }
            }
        }
    } catch (e) {
        console.error("Erro ao processar entrada do teclado:", e);
    }
});

// Adicionar novo event listener para keyup:
document.addEventListener("keyup", (e) => {
    try {
        if (!gameOver && !gameWon) {
            // Parar movimento quando tecla é solta
            if (e.key === "ArrowLeft") {
                player.movingLeft = false;
            } else if (e.key === "ArrowRight") {
                player.movingRight = false;
            }
        }
    } catch (e) {
        console.error("Erro ao processar liberação de tecla:", e);
    }
});

// Função robusta para verificar e atualizar os recordes
function checkHighScoresAnterior() {
    try {
        // Verifica se já foi processado este recorde (adicione esta flag)
        if (window.highScoreProcessed) return;
        
        // Obtém os recordes salvos ou inicializa como array vazio
        let highScores = JSON.parse(localStorage.getItem("highScores")) || [];
        
        // Se houver menos de 5 recordes ou se o score atual for maior que o menor dos recordes existentes
        if (highScores.length < 5 || score > highScores[highScores.length - 1].score) {
            // Marca que já foi processado este recorde
            window.highScoreProcessed = true;
            
            let playerName = prompt("Novo recorde! Insira seu nome:");
            if (!playerName) {
                playerName = "Anônimo";
            }
            
            const now = new Date().toLocaleDateString();

            // Adiciona o novo recorde
            highScores.push({ name: playerName, score: score, date: now });
            
            // Ordena os recordes em ordem decrescente (maior score primeiro)
            highScores.sort((a, b) => b.score - a.score);
            
            // Mantém somente os 5 melhores recordes
            highScores = highScores.slice(0, 5);
            
            // Salva os recordes atualizados no localStorage
            localStorage.setItem("highScores", JSON.stringify(highScores));
        }
        
        // Atualiza a exibição dos recordes
        updateHighScoreTable();
    } catch (e) {
        console.error("Erro ao atualizar recordes:", e);
    }
}

// Modifique a função checkHighScores() para chamar updateFinalReport em vez de updateHighScoreTable
function checkHighScores() {
    try {
        // Verifica se já foi processado este recorde
        if (window.highScoreProcessed) return;
        
        // Obtém os recordes salvos ou inicializa como array vazio
        let highScores = JSON.parse(localStorage.getItem("highScores")) || [];
        
        // Se houver menos de 5 recordes ou se o score atual for maior que o menor dos recordes existentes
        if (highScores.length < 5 || score > highScores[highScores.length - 1].score) {
            // Marca que já foi processado este recorde
            window.highScoreProcessed = true;
            
            let playerName = prompt("Novo recorde! Insira seu nome:");
            if (!playerName) {
                playerName = "Anônimo";
            }
            
            const now = new Date().toLocaleDateString();

            // Adiciona o novo recorde
            highScores.push({ name: playerName, score: score, date: now });
            
            // Ordena os recordes em ordem decrescente (maior score primeiro)
            highScores.sort((a, b) => b.score - a.score);
            
            // Mantém somente os 5 melhores recordes
            highScores = highScores.slice(0, 5);
            
            // Salva os recordes atualizados no localStorage
            localStorage.setItem("highScores", JSON.stringify(highScores));
        }
        
        // CORREÇÃO: Chama a função correta para exibir o relatório detalhado
        updateFinalReport(); // <-- Substituído updateHighScoreTable por updateFinalReport
    } catch (e) {
        console.error("Erro ao atualizar recordes:", e);
    }
}

// Função para atualizar a tabela de recordes na interface
function updateHighScoreTable() {
    try {
        let highScores = JSON.parse(localStorage.getItem("highScores")) || [];
        const tableDiv = document.getElementById("highscore-table");
        if (!tableDiv) return;
        
        let html = `
            <div style="background: rgba(0,0,0,0.7); color: orange; padding: 20px; border-radius: 10px; width: 90%; max-width: 720px; margin: 20px auto;">
                <h2 style="text-align:center; margin-bottom: 10px;">RECORDES</h2>
                <table style="width:100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: linear-gradient(to right, #FF3, #F60); color: #000;">
                            <th style="padding: 8px;">Posição</th>
                            <th style="padding: 8px;">Nome</th>
                            <th style="padding: 8px;">Pontos</th>
                            <th style="padding: 8px;">Data/Hora</th>
                        </tr>
                    </thead>
                    <tbody>`;
                    
        highScores.forEach((record, index) => {
            html += `
                <tr style="border-bottom: 1px solid #555;">
                    <td style="padding: 8px; text-align:center;">${index+1}</td>
                    <td style="padding: 8px; text-align:center;">${record.name}</td>
                    <td style="padding: 8px; text-align:center;">${record.score}</td>
                    <td style="padding: 8px; text-align:center;">${record.date}</td>
                </tr>`;
        });
        
        html += `
                    </tbody>
                </table>
            </div>`;
        
        tableDiv.innerHTML = html;
    } catch (e) {
        console.error("Erro ao atualizar tabela de recordes:", e);
    }
}

// Função para zerar os recordes
function clearHighScores() {
    try {
        // Remove os recordes do localStorage
        localStorage.removeItem("highScores");
        console.log("Recordes zerados com sucesso!");
        
        // Atualiza a tabela se estiver visível
        if (document.getElementById("highscore-table")) {
            document.getElementById("highscore-table").innerHTML = "";
        }
    } catch (e) {
        console.error("Erro ao zerar recordes:", e);
    }
}

// Função para atualizar o relatório final
function updateFinalReport() {
    try {
        const hs = JSON.parse(localStorage.getItem("highScores"))||[];
        const ptsElimin = score + missedShots + lostLivesCount*10;
        const ptsMissed = missedShots;
        const ptsLost   = lostLivesCount*10;
        const totalPts  = score;
        const elimQtd   = Math.round(ptsElimin/2);

        let html = `<div style="font-family:sans-serif;color:#0F0;display:flex;
                    flex-direction:row;justify-content:space-between;
                    width:90%;max-width:720px;margin:20px auto;
                    background:rgba(0,0,0,0.7);padding:20px;border-radius:10px">`;

        /* Recordes ------------------------------------------------ */
        html += `<div style="flex:1;padding:10px;text-align:center">
                 <h3 style="margin:0 0 10px">RECORDES</h3>
                 <table style="width:100%;border-collapse:collapse;font-size:14px">
                 <thead><tr>
                  <th style="border-bottom:1px solid #0F0;padding:6px 0">Pos</th>
                  <th style="border-bottom:1px solid #0F0;padding:6px 0">Nome</th>
                  <th style="border-bottom:1px solid #0F0;padding:6px 0">Pontos</th>
                  <th style="border-bottom:1px solid #0F0;padding:6px 0">Data</th>
                 </tr></thead><tbody>`;
        hs.forEach((r,i)=>{html+=`<tr>
                 <td style="text-align:center;padding:6px 0">${i+1}</td>
                 <td style="text-align:center;padding:6px 0">${r.name}</td>
                 <td style="text-align:center;padding:6px 0">${r.score}</td>
                 <td style="text-align:center;padding:6px 0">${r.date}</td></tr>`});
        html += `</tbody></table></div>`;

        /* Relatório ---------------------------------------------- */
        html += `<div style="flex:1;padding:10px;text-align:center">
                 <h3 style="margin:0 0 10px">RELATÓRIO DE PONTUAÇÃO</h3>
                 <table style="width:100%;border-collapse:collapse;font-size:14px">
                 <thead><tr>
                  <th style="border-bottom:1px solid #0F0;padding:6px 0">Item</th>
                  <th style="border-bottom:1px solid #0F0;padding:6px 0">Qtd</th>
                  <th style="border-bottom:1px solid #0F0;padding:6px 0">Valor</th>
                  <th style="border-bottom:1px solid #0F0;padding:6px 0">Total</th>
                 </tr></thead><tbody>
                 <tr><td style="padding:6px 0">Eliminados</td><td style="padding:6px 0">${elimQtd}</td><td style="padding:6px 0">2</td>
                     <td style="padding:6px 0">${ptsElimin}</td></tr>
                 <tr><td style="padding:6px 0">Tiros errados</td><td style="padding:6px 0">${missedShots}</td><td style="padding:6px 0">-1</td>
                     <td style="padding:6px 0">-${ptsMissed}</td></tr>
                 <tr><td style="padding:6px 0">Vidas perdidas</td><td style="padding:6px 0">${lostLivesCount}</td><td style="padding:6px 0">-10</td>
                     <td style="padding:6px 0">-${ptsLost}</td></tr>
                 <tr><td colspan="3" style="text-align:right;border-top:1px solid #0F0;padding:6px 0">
                     <strong>PONTOS TOTAIS:</strong></td>
                     <td style="border-top:1px solid #0F0;padding:6px 0">
                     <strong>${totalPts}</strong></td></tr>
                 </tbody></table></div></div>`;

        const div = document.getElementById("highscore-table");
        if(div){
            div.innerHTML = html;
            div.style.position = "absolute";
            div.style.top  = "30%";
            div.style.left = "50%";
            div.style.transform = "translate(-50%,0)";
            div.style.zIndex = "100";
        }
    }catch(e){console.error("updateFinalReport",e);}
}

/* ╔══════════════════════════════════════════════════════════════╗
   ║                      REINICIAR JOGO                          ║
   ╚══════════════════════════════════════════════════════════════╝ */
function resetGame(){
    try{
        // Cancela o loop anterior para evitar "turbo"
        if(rafId!==null){ cancelAnimationFrame(rafId); rafId=null; }

        window.highScoreProcessed=false;
        currentLevel=1;
        levelTransitionActive=false;
        moveInterval=500;
        invaderShootInterval=750;
        window.projectileSpeed=3;
        window.invaderProjectileSpeed=3;

        invaders=[]; barriers=[];
        playerProjectiles=[]; invaderProjectiles=[];
        score=missedShots=lostLivesCount=0;
        invaderDirection=1; moveAccumulator=0;
        gameOver=gameWon=false; gameStarted=false;

        if(soundManager){ soundManager.invaderSoundSpeed=1; soundManager.stepModulo=2; }

        init();
    }catch(e){console.error("resetGame",e);location.reload();}
}

/* ╔══════════════════════════════════════════════════════════════╗
   ║         FUNÇÕES RESTANTES (startNextLevel, eventos, ...)      ║
   ╚══════════════════════════════════════════════════════════════╝ */
/*  Copie aqui, sem alterações, as funções 
    checkHighScores(), renderHeader(), eventos de teclado (keydown/keyup)
    e demais blocos do seu arquivo original. Nada precisa ser modificado
    nelas para as correções solicitadas funcionar.                     */
function startNextLevel() {
  try {
    // Limpa flags e objetos da fase anterior
    levelTransitionActive = false;
    playerProjectiles = [];
    invaderProjectiles = [];
    invaders = [];
    window.preventVictoryCheck = true; // evita vitória imediata

    // Ajusta dificuldade (velocidade) conforme a fase
    if (currentLevel === 2) {
      // fase 2: 25% mais rápido que a base
      moveInterval = 500 * 0.75;            // 375ms
      invaderShootInterval = 750 * 0.75;    // 562.5ms ~ 560ms
    } else if (currentLevel === 3) {
      // fase 3: mais rápido ainda, 25% sobre a fase 2
      moveInterval = (500 * 0.75) * 0.75;    // ~281ms
      invaderShootInterval = 750 * 0.75;     // mantém 562.5ms
    }

    // Reconstrói as barreiras e concede vida extra
    barriers = [];
    const headerH = 42;
    const numBarriers = 4, bW = 60, bSpacing = 100;
    const totalW = numBarriers * bW + (numBarriers - 1) * bSpacing;
    const startX = (canvas.width - totalW) / 2;
    for (let i = 0; i < numBarriers; i++) {
      barriers.push(new Barrier(
        startX + i * (bW + bSpacing),
        canvas.height - 150 + headerH / 2
      ));
    }
    if (player.lives < 5) {
      player.lives++;
      player.maxProjectiles = player.lives;
      if (soundManager) soundManager.playVictorySound();
    }

    // Recria a horda de invasores
    const rows = 5, cols = 11, sX = 45, sY = 33;
    if (currentLevel === 2) {
      // formação em "W"
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let offsetY = 0;
          if (c === 1 || c === 9) offsetY = 15;
          else if (c === 2 || c === 8) offsetY = 30;
          else if (c === 3 || c === 7) offsetY = 15;
          else if (c === 5) offsetY = 15;
          invaders.push(new Invader(
            c * sX + 35,
            r * sY + 70 + headerH + offsetY
          ));
        }
      }
    } else if (currentLevel === 3) {
      // formação em diamante
      const mid = Math.floor(cols / 2);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const dist = Math.abs(c - mid);
          let offsetY = r < 2
            ? dist * 15                  // topo do diamante
            : (rows - 1 - dist) * 15;    // base do diamante
          invaders.push(new Invader(
            c * sX + 35,
            r * sY + 70 + headerH + offsetY
          ));
        }
      }
    } else {
      // (não deve ocorrer, mas previne erros)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          invaders.push(new Invader(
            c * sX + 35,
            r * sY + 70 + headerH
          ));
        }
      }
    }

    // Reposiciona o jogador no centro
    player.x = canvas.width / 2 - player.width / 2;

    // Debounce da checagem de vitória
    setTimeout(() => {
      window.preventVictoryCheck = false;
    }, 500);
  } catch (e) {
    console.error("Erro ao iniciar próximo nível:", e);
  }
}


/* ╔══════════════════════════════════════════════════════════════╗
   ║                           STARTUP                            ║
   ╚══════════════════════════════════════════════════════════════╝ */

   window.onload = function() {
    init();
    
    // Agora é seguro acessar canvas pois estamos após init()
    if (canvas.hasClickEventListener) {
        canvas.removeEventListener('click', startGame);
        canvas.hasClickEventListener = false;
    }
    
    // Registra listener para iniciar com Tecla Espaço
    document.addEventListener("keydown", function startSpaceListener(e) {
        if (!gameStarted && !countdownActive && e.code === "Space") {
            e.preventDefault();
            // Remove este listener (só precisa disparar uma vez)
            document.removeEventListener("keydown", startSpaceListener);
            startGame();
        }
    });
};



// Detecção de colisão otimizada
function isColliding(a, b) {
    try {
        // Detecção rápida usando bounding box
        return !(
            a.x + a.width < b.x ||
            b.x + b.width < a.x ||
            a.y + a.height < b.y ||
            b.y + b.height < a.y
        );
    } catch (e) {
        console.error("Erro na detecção de colisão:", e);
        // Valor padrão seguro para evitar comportamentos inesperados
        return false;
    }
}

// Função de atualização da lógica do jogo
function update(deltaTime) {
    try {
        // Processa movimento contínuo do jogador - NOVO
        if (player.movingLeft) {
            player.moveLeft();
        }
        if (player.movingRight) { // Usando if separado para permitir cancelamento instantâneo
            player.moveRight();
        }

        // Limite o número máximo de projéteis na tela
        if (playerProjectiles.length > 10) {
            // Remover os mais antigos se houver muitos
            playerProjectiles = playerProjectiles.slice(-10);
        }

        if (invaderProjectiles.length > 15) {
            // Remover os mais antigos se houver muitos
            invaderProjectiles = invaderProjectiles.slice(-15);
        }

        // Atualiza o player (para o efeito de piscar)
        player.update(deltaTime);

        // Atualiza a posição dos projéteis do jogador
        playerProjectiles.forEach(projectile => {
            projectile.update();
        });

        // Atualiza os invasores (para movimentação e explosões)
        invaders.forEach(invader => {
            invader.update(deltaTime);
        });

        // Acumula o tempo decorrido
        moveAccumulator += deltaTime;

        // Se passou 500ms (0.5 segundo), executa um movimento de "passo"
        if (moveAccumulator >= moveInterval) {
            moveAccumulator = 0; // Resetar acumulador

            // Tocar o som característico dos invasores se o jogo não estiver pausado
            if (!isPaused && soundManager) {
                soundManager.playInvaderStep();
            }

            // Determina a posição dos invasores vivos para checar as bordas
            let leftmost = canvas.width;
            let rightmost = 0;
            invaders.forEach(invader => {
                if (invader.alive) {
                    leftmost = Math.min(leftmost, invader.x);
                    rightmost = Math.max(rightmost, invader.x + invader.width);
                }
            });

            // Verifica se a formação atinge as bordas e inverte a direção, descendo uma linha
            const hitRightBoundary = (rightmost + horizontalStep >= canvas.width);
            const hitLeftBoundary = (leftmost - horizontalStep <= 0);

            if ((invaderDirection > 0 && hitRightBoundary) ||
                (invaderDirection < 0 && hitLeftBoundary)) {
                // Mudar direção
                invaderDirection *= -1;

                // Mover todos os invasores para baixo
                invaders.forEach(invader => {
                    if (invader.alive) {
                        invader.y += descentStep;

                        // Verificar se chegaram na linha do jogador
                        if (invader.y + invader.height >= player.y) {
                            gameOver = true;
                        }

                        // Alternar frame de animação
                        invader.toggleFrame();
                    }
                });

                // ADICIONE AQUI: Aumenta a velocidade em 20% (reduz o intervalo para 80% do valor)
                moveInterval *= 0.8;

                // Limite para velocidade máxima
                moveInterval = Math.max(moveInterval, 100); // Evita que fique rápido demais

                // Também acelera os tiros dos invasores para acompanhar
                invaderShootInterval *= 0.9;
                invaderShootInterval = Math.max(invaderShootInterval, 300);

                // Se o som estiver inicializado, atualiza também a velocidade do som
                if (soundManager) {
                    soundManager.invaderSoundSpeed *= 1.2; // Aumenta 20% a velocidade do som
                }
            } else {
                // Movimento horizontal normal
                invaders.forEach(invader => {
                    if (invader.alive) {
                        invader.x += invaderDirection * horizontalStep;

                        // Alternar frame de animação
                        invader.toggleFrame();
                    }
                });
            }
        }

        // Verificar se invasores colidiram com barreiras após o movimento
        invaders.forEach(invader => {
            if (invader.alive) {
                // Para cada barreira
                barriers.forEach(barrier => {
                    // Para cada tijolo na barreira
                    barrier.bricks.forEach(brick => {
                        if (brick.health > 0 && isColliding(invader, brick)) {
                            // O invasor destroi o tijolo ao colidir
                            brick.takeDamage();

                            // Opcionalmente, podemos diminuir completamente a saúde para destruir o tijolo
                            brick.health = 0;
                        }
                    });
                });
            }
        });

        // Atualização dos tiros do jogador
        playerProjectiles.forEach(projectile => {
            if (!projectile.active) return;
            let hitSomething = false;

            // Verificar colisão com barreiras (NOVO)
            barriers.forEach(barrier => {
                if (hitSomething) return;
                
                barrier.bricks.forEach(brick => {
                    if (brick.health > 0 && isColliding(projectile, brick)) {
                        brick.takeDamage();
                        projectile.active = false;
                        hitSomething = true;
                        
                        // Toca som de impacto na barreira
                        if (soundManager) {
                            soundManager.playShortExplosionSound();
                        }
                    }
                });
            });

            // Verificar colisão com invasores (código existente)
            invaders.forEach(invader => {
                if (invader.alive && !invader.exploding && projectile.active && !hitSomething && isColliding(projectile, invader)) {
                    // Inicia a explosão em vez de remover imediatamente
                    invader.startExplosion();
                    projectile.active = false;
                    hitSomething = true;
                    score += 2;
                    
                    // Reproduz o novo som de explosão
                    if (soundManager) {
                        soundManager.playInvaderHitSound();
                    }
                }
            });

            // Verificar colisão com o topo da tela (código existente)
            if (projectile.active && projectile.y < TOP_LINE_Y + TOP_LINE_HEIGHT) {
                projectile.active = false;
                topLineColor = "#F00";
                setTimeout(() => { topLineColor = "#333"; }, 100);
                
                // Incrementa contador de tiros perdidos
                missedShots++;
                
                // NOVO: Subtrai pontos por tiros perdidos durante o jogo
                score -= 1;
                
                // Toca som de acerto na linha de topo
                if (soundManager) {
                    soundManager.playTopLineHitSound();
                }
            }
        });

        // Se o jogador não está atirando e o número de projéteis é menor que o máximo, permitir novo tiro
        if (playerProjectiles.length === 0) {
            player.resetShot();
        } else if (playerProjectiles.length < player.maxProjectiles && player.shooting) {
            // Permite atirar mais projéteis se o limite não foi atingido
            player.resetShot();
        }

        // Substitua o bloco de verificação de vitória atual:
        // Verificar vitória - MODIFICADO para incluir verificação de preventVictoryCheck
        const remainingInvaders = invaders.filter(invader => invader.alive).length;
        
        if (remainingInvaders === 0 && !gameWon && !levelTransitionActive && !window.preventVictoryCheck) {
            console.log("Fase completada! Invasores restantes: " + remainingInvaders);
            
            if (currentLevel < maxLevel) {
                // Iniciar transição para o próximo nível
                levelTransitionActive = true;
                levelTransitionTimer = 0;
                
                // Tocar o som de vitória do nível
                if (soundManager) soundManager.playVictorySound();
            } else {
                // Vitória final - todos os níveis concluídos
                gameWon = true;
                
                // Tocar o som de vitória
                if (soundManager) soundManager.playVictorySound();
            }
        }

        // Processar transição de nível, se ativa
        if (levelTransitionActive) {
            levelTransitionTimer += deltaTime;
            
            if (levelTransitionTimer >= levelTransitionDuration) {
                // Termina a transição e inicia o próximo nível
                levelTransitionActive = false;
                currentLevel++;
                startNextLevel();
            }
        }

        // OPCIONAL: Tiros dos invasores
        invaderShootTimer += deltaTime;
        if (invaderShootTimer >= invaderShootInterval) {
            invaderShootTimer = 0;

            // Escolher um invasor aleatório para atirar
            const livingInvaders = invaders.filter(invader => invader.alive);
            if (livingInvaders.length > 0) {
                const shooter = livingInvaders[Math.floor(Math.random() * livingInvaders.length)];

                // Criar um novo tiro
                const projectile = new Projectile(
                    shooter.x + (shooter.width / 2) - 2,
                    shooter.y + shooter.height,
                    4, 5, 3, -1, "#f00" // Velocidade reduzida de 5 para 3
                );
                invaderProjectiles.push(projectile);
            }
        }

        // Atualizar e verificar colisões de tiros dos invasores
        invaderProjectiles.forEach(projectile => {
            projectile.update();

            // Colisão com o jogador - dando período de invencibilidade após hit
            if (projectile.active && isColliding(projectile, player)) {
                // Garante que o jogador não perde vida durante o período de piscar
                if (!player.blinking) {
                    projectile.active = false;

                    // Agora o jogador perde uma vida em vez de game over imediato
                    player.loseLife();

                    // ALTERADO: Permite pontuação negativa
                    score = score - 10;
                    lostLivesCount++;

                    // Tocar o som de jogador atingido
                    if (soundManager) soundManager.playPlayerHitSound();

                    if (player.lives <= 0) {
                        gameOver = true;
                        if (soundManager) {
                            soundManager.playGameOverSound();
                        }
                    }
                }
            }

            // Colisão com tijolos
            barriers.forEach(barrier => {
                barrier.bricks.forEach(brick => {
                    if (brick.health > 0 && projectile.active && isColliding(projectile, brick)) {
                        brick.takeDamage();
                        projectile.active = false;
                    }
                });
            });
        });

        // Remover tiros de invasores inativos
        invaderProjectiles = invaderProjectiles.filter(projectile => projectile.active);

        // Chama a função de limpeza de objetos inativos
        cleanupInactiveObjects();
    } catch (e) {
        console.error("Erro na atualização do jogo:", e);
        // Tratamento de recuperação - impede que o jogo trave completamente
        moveAccumulator = 0;
        invaderShootTimer = 0;
    }
}

// Função para calcular a pontuação
function updateScore() {
    // Não faz nada, a pontuação é atualizada diretamente nos eventos
}

// Substitua a função renderHeader() atual por esta versão atualizada:

function renderHeader() {
    // Gradiente para o fundo do header
    const headerGradient = ctx.createLinearGradient(0, 0, 0, 42);
    headerGradient.addColorStop(0, "#001122");
    headerGradient.addColorStop(1, "#112244");
    ctx.fillStyle = headerGradient;
    ctx.fillRect(0, 0, canvas.width, 40);

    // Borda inferior iluminada
    const borderGradient = ctx.createLinearGradient(0, 40, 0, 42);
    borderGradient.addColorStop(0, "#0F0");
    borderGradient.addColorStop(1, "#00FF88");
    ctx.fillStyle = borderGradient;
    ctx.fillRect(0, 40, canvas.width, 2);

    // Efeito de brilho no header - pequenos pontos luminosos
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * 40;
        const size = Math.random() * 2 + 1;
        ctx.fillStyle = "rgba(0, 255, 255, 0.7)";
        ctx.fillRect(x, y, size, size);
    }

    // Informações no header com efeitos visuais
    // Lado esquerdo - Ícones de vida com efeito de brilho
    ctx.textAlign = "left";

    // Desenha os canhões representando as vidas com efeito de brilho
    const lifeIconWidth = 15;
    const lifeIconSpacing = 5;
    const startX = 20;

    for (let i = 0; i < player.lives; i++) {
        const iconX = startX + (i * (lifeIconWidth + lifeIconSpacing));

        // Efeito de brilho ao redor do ícone de vida
        ctx.fillStyle = "rgba(0, 255, 0, 0.2)";
        ctx.fillRect(iconX - 2, 8, lifeIconWidth + 4, 15);

        // Base retangular
        ctx.fillStyle = "#0F8";
        ctx.fillRect(iconX, 15, lifeIconWidth, 10);

        // Canhão retangular no centro
        ctx.fillRect(iconX + (lifeIconWidth / 2) - 2, 10, 4, 5);
    }

    // Contador de tiros com efeito 3D
    ctx.fillStyle = "#FFF";
    ctx.font = "bold 18px Arial";
    const shotText = `Tiros: ${player.totalShotsFired}`;
    ctx.fillText(shotText, 110, 25);

    // Sombra sutil para efeito 3D
    ctx.fillStyle = "rgba(0, 128, 255, 0.5)";
    ctx.fillText(shotText, 111, 26);

    // Centro - Pontuação atual
    ctx.textAlign = "center";
    ctx.font = "bold 22px Arial";

    // Efeito de brilho pulsante para a pontuação
    const pulseValue = (Math.sin(Date.now() * 0.005) + 1) * 0.5;
    ctx.fillStyle = `rgb(255, ${Math.floor(215 + pulseValue * 40)}, 0)`;
    ctx.fillText(`PONTUAÇÃO: ${score}`, canvas.width / 2, 25);

    // Efeito de reflexo
    ctx.fillStyle = "rgba(255, 165, 0, 0.3)";
    ctx.fillText(`PONTUAÇÃO: ${score}`, canvas.width / 2, 27);

    // Fase atual
    ctx.textAlign = "left";
    ctx.font = "bold 18px Arial";
    ctx.fillStyle = "#0FF";
    ctx.fillText(`FASE: ${currentLevel}/${maxLevel}`, canvas.width * 3 / 4, 25);

    // Lado direito - Contador de invasores (MODIFICADO: Removido o ícone do invasor)
    ctx.textAlign = "right";
    ctx.font = "bold 18px Arial";
    const totalInvaders = invaders.length;
    const killedInvaders = invaders.filter(invader => !invader.alive).length;
    const totalInvadersText = `${killedInvaders} / ${totalInvaders}`;

    // Gradiente para o texto de contador
    const textGradient = ctx.createLinearGradient(
        canvas.width - 100, 15,
        canvas.width - 20, 25
    );
    textGradient.addColorStop(0, "#FF3");
    textGradient.addColorStop(1, "#F60");
    ctx.fillStyle = textGradient;

    // Texto do contador
    ctx.fillText(totalInvadersText, canvas.width - 20, 25);
}
