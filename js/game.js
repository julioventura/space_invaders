/*
  game.js
  - Arquivo central que integra todos os módulos do jogo.
  - Gerencia o game loop com requestAnimationFrame, captura de inputs e atualização da lógica do jogo.
  - Atualiza e renderiza todos os elementos: jogador, invasores, barreiras e tiros.
*/

// Seleciona o canvas e define o contexto para desenho
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Declaração de variáveis globais
let player;
let invaders = [];
let barriers = [];
let playerProjectiles = []; // Array para armazenar os tiros do jogador
let invaderProjectiles = []; // Array para tiros dos invasores (opcional)
let lastTime = 0;
let invaderDirection = 1; // 1 = direita, -1 = esquerda
let moveAccumulator = 0;  // Acumula tempo para mover os invasores em passos de 0.5 segundo
let moveInterval = 500;  // Intervalo REDUZIDO para 500ms (era 1000ms)
const descentStep = 30;   // DOBRADO - era 10 pixels
const horizontalStep = 10; // Passo horizontal dos invasores em pixels
let gameOver = false;
let gameWon = false;
let invaderShootTimer = 0;
let invaderShootInterval = 750; // REDUZIDO para 750ms (era 1500ms)
let isPaused = false; // Variável para controlar o estado de pausa
let soundManager; // Variável para gerenciar sons
let gameStarted = false; // Indicador de inicialização
let gameStartTime = 0; // Tempo de início do jogo
let reducedGraphics = false; // Variável global para gráficos reduzidos

// Add near global variables:
let topLineColor = "#333";  // cor padrão agora é #333
const TOP_LINE_Y = 52;        // 10 px abaixo do header (header: 0 a 42 → 42+10=52)
const TOP_LINE_HEIGHT = 5;

// Variáveis para pontuação e vidas perdidas
let score = 0;               // Pontuação atual - começa em 0
let missedShots = 0;         // Contador de tiros perdidos
let lostLivesCount = 0;      // Contador de vidas perdidas

// Monitor de desempenho
let gamePerformance = {
    lastCleanup: 0,
    frameCount: 0,
    frameTime: 0,
    recoveryMode: false
};

// Modificação do Loop Principal
let lastFrameTime = 0;
const TARGET_FPS = 60;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

// Coloque estas variáveis globais, logo após as demais declarações:
let starImg = new Image();
starImg.src = "img/stars.jpg"; // Caminho para a imagem de estrelas
let starOffset = 0;
let starSpeed = 0.5; // Velocidade de deslocamento das estrelas

function gameLoop(timestamp) {
    // Limitar a taxa de quadros
    if (timestamp - lastFrameTime < FRAME_INTERVAL) {
        requestAnimationFrame(gameLoop);
        return;
    }

    // Calcular tempo delta com limite máximo para evitar saltos enormes
    const deltaTime = Math.min(timestamp - lastFrameTime, 100);
    lastFrameTime = timestamp;

    // Renovação periódica do contexto de áudio para evitar vazamentos
    const runningTime = timestamp - gameStartTime;
    if (soundManager && soundManager.audioContext && runningTime > 60000 && runningTime % 60000 < 50) {
        try {
            // A cada minuto, limita o número de osciladores
            soundManager.activeOscillators = 0;
            console.log("Sistema de áudio renovado");
        } catch (e) {
            console.warn("Erro ao renovar áudio:", e);
        }
    }

    try {
        // Processamento do jogo com proteção contra erros
        if (!isPaused) {
            update(deltaTime);
        }
        render();
    } catch (e) {
        console.error("Erro no loop do jogo:", e);
        // Tenta recuperar de erros
        isPaused = true;
        setTimeout(() => {
            isPaused = false;
            lastFrameTime = performance.now();
        }, 1000);
    }

    // Monitor de desempenho
    gamePerformance.frameCount++;
    gamePerformance.frameTime += deltaTime;

    // A cada 5 segundos, verificar o desempenho
    if (gamePerformance.frameTime >= 5000) {
        const fps = gamePerformance.frameCount / (gamePerformance.frameTime / 1000);
        console.log("FPS médio:", fps.toFixed(2));

        // Se o FPS estiver muito baixo, entrar em modo de recuperação
        if (fps < 30 && !gamePerformance.recoveryMode) {
            console.warn("Desempenho baixo detectado, ativando modo de recuperação");
            gamePerformance.recoveryMode = true;

            // Reduzir a carga visual e de processamento
            reducedGraphics = true;

            // Forçar limpeza de objetos
            cleanupInactiveObjects();
        }

        // Resetar contadores
        gamePerformance.frameCount = 0;
        gamePerformance.frameTime = 0;
    }

    // Limpeza periódica de objetos a cada 2 segundos
    if (timestamp - gamePerformance.lastCleanup > 2000) {
        cleanupInactiveObjects();
        gamePerformance.lastCleanup = timestamp;
    }

    // Continue o loop se o jogo não acabou
    if (!gameOver && !gameWon) {
        requestAnimationFrame(gameLoop);
    }
}

// Função de inicialização do jogo
function init() {
    try {
        // Inicializa o sistema de som
        soundManager = new SoundManager();
        soundManager.init();

        // Constante para o tamanho do header
        const headerHeight = 42; // 40px header + 2px borda

        // Instancia o jogador com ajuste para o header
        player = new Player(canvas.width / 2 - 20, canvas.height - 40 + headerHeight / 2);

        // Criação da formação de invasores
        const rows = 5;
        const cols = 10; // Alterado: 10 invasores por linha conforme solicitado
        const spacingX = 45; // Ajustado para melhor distribuição
        const spacingY = 30;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * spacingX + 35; // Ajuste para centralizar
                const y = row * spacingY + 70 + headerHeight;
                invaders.push(new Invader(x, y));
            }
        }

        // Criação de 4 barreiras
        const numBarriers = 4;
        for (let i = 0; i < numBarriers; i++) {
            const x = 50 + i * 150;
            const y = canvas.height - 150 + headerHeight / 2;
            barriers.push(new Barrier(x, y));
        }

        // Mostra a tela inicial em vez de começar o jogo diretamente
        renderStartScreen();

        // O jogo só começa quando o jogador clicar na tela
        gameStarted = false;

        // Garante que os contadores de pontuação começam zerados
        score = 0;
        lostLivesCount = 0;
        missedShots = 0;
    } catch (e) {
        console.error("Erro na inicialização do jogo:", e);
        alert("Erro ao iniciar o jogo. Recarregue a página.");
    }
}

// Substitua a função renderStartScreen
function renderStartScreen() {
    // Desenha o fundo animado com as estrelas:
    // Atualiza o offset para criar o efeito de movimento
    starOffset += starSpeed;
    if (starOffset > canvas.height) {
        starOffset = 0;
    }
    // Repete a imagem para preencher toda a tela verticalmente
    for (let y = -canvas.height; y < canvas.height; y += canvas.height) {
        ctx.drawImage(starImg, 0, starOffset + y, canvas.width, canvas.height);
    }

    // Sobrepõe os elementos de texto
    // Título do jogo
    ctx.fillStyle = "#0F0";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("SPACE INVADERS", canvas.width / 2, canvas.height / 4);

    // Instrução principal
    ctx.font = "24px Arial";
    ctx.fillText("ESPAÇO para iniciar e atirar", canvas.width / 2, canvas.height / 2.5);

    // Instruções de controle
    ctx.font = "16px Arial";
    ctx.fillStyle = "white"; // Define a cor branca para o texto
    const instructionsY = canvas.height * 2.5 / 4;
    ctx.fillText("← → : Mover (setas)", canvas.width / 2, instructionsY + 0);
    ctx.fillText("↑ ↓ : Aumentar/diminuir volume", canvas.width / 2, instructionsY + 25);
    ctx.fillText("M : Ativar/desativar som", canvas.width / 2, instructionsY + 50);
    ctx.fillText("ESC : Pausar o jogo", canvas.width / 2, instructionsY + 75);

    // Versão
    ctx.fillText("Versão 1.0 (10/04/2025)", canvas.width / 2, instructionsY + 150);
}

// Remova o event listener de clique e use apenas a tecla espaço
if (canvas.hasClickEventListener) {
    canvas.removeEventListener('click', startGame);
    canvas.hasClickEventListener = false;
}

// Ajuste na função startGame:

function startGame() {
    try {
        if (gameStarted) return;

        gameStarted = true;
        gameStartTime = performance.now();
        lastFrameTime = performance.now();

        // Ativa o sistema de som
        if (soundManager) {
            soundManager.activate();
        }

        // Reseta o contador de tiros se necessário
        if (player) {
            player.totalShotsFired = 0;
        }

        // Inicia o loop de jogo
        requestAnimationFrame(gameLoop);
    } catch (e) {
        console.error("Erro ao iniciar o jogo:", e);
        // Tenta reiniciar o processo
        gameStarted = false;
        setTimeout(startGame, 1000);
    }
}

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
            projectile.update();
            let hitSomething = false; // Flag para detectar se o projétil acertou algo

            // Verifica colisões com invasores
            invaders.forEach(invader => {
                if (invader.alive && projectile.active && isColliding(projectile, invader)) {
                    invader.alive = false;
                    projectile.active = false;
                    player.resetShot();
                    hitSomething = true;
                    score = score + 2;
                    if (soundManager) soundManager.playInvaderHitSound();
                }
            });

            // Verifica colisões com barreiras
            barriers.forEach(barrier => {
                barrier.bricks.forEach(brick => {
                    if (brick.health > 0 && projectile.active && isColliding(projectile, brick)) {
                        brick.takeDamage();
                        projectile.active = false;
                        player.resetShot();
                        hitSomething = true;
                    }
                });
            });

            // Se o projétil atingir a área da linha-alvo do topo
            if (projectile.active && projectile.y < TOP_LINE_Y + TOP_LINE_HEIGHT) {
                projectile.active = false;
                player.resetShot();
                score = score - 1;       // Desconta 1 ponto
                missedShots++;
                console.log("Tiro atingiu a linha do topo! -1 ponto. Pontuação: " + score);
                if (soundManager) {
                    soundManager.playTopLineHitSound();  // Toca o som específico para a linha de topo
                }
                topLineColor = "red";   // Altera a cor da linha para vermelho
                setTimeout(() => { topLineColor = "#333"; }, 500);
            }
        });

        // Remover tiros inativos
        playerProjectiles = playerProjectiles.filter(projectile => projectile.active);

        // Se o jogador não está atirando e o número de projéteis é menor que o máximo, permitir novo tiro
        if (playerProjectiles.length === 0) {
            player.resetShot();
        } else if (playerProjectiles.length < player.maxProjectiles && player.shooting) {
            // Permite atirar mais projéteis se o limite não foi atingido
            player.resetShot();
        }

        // Verificar vitória
        const remainingInvaders = invaders.filter(invader => invader.alive).length;
        if (remainingInvaders === 0 && !gameWon) {
            gameWon = true;

            // Tocar o som de vitória
            if (soundManager) soundManager.playVictorySound();
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
                    4, 5, 5, -1, "#f00" // Velocidade (5)
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

    // Lado direito - Contador de invasores com ícone
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

    // Desenha um pequeno invasor como ícone
    ctx.fillRect(canvas.width - 105, 15, 10, 5);
    ctx.fillRect(canvas.width - 108, 20, 16, 5);

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
            // Esmaecer a tela inteira
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Fundo semi-transparente para facilitar a leitura
            // ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            // ctx.fillRect(0, canvas.height/2 - 50, canvas.width, 230);

            // Mensagem principal
            ctx.fillStyle = "#fff";
            ctx.font = "36px Arial";
            ctx.textAlign = "center";

            if (gameWon) {
                ctx.fillText("VOCÊ VENCEU!", canvas.width / 2, canvas.height / 4);
            } else {
                ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 4);
            }

            // Cálculo dos valores: 
            // Eliminados: número de invasores mortos
            const eliminated = invaders.filter(invader => !invader.alive).length;
            const pointsEliminated = eliminated * 2;
            // Para tiros errados: cada tiro errado perde 1 pontos
            const pointsMissed = missedShots * 1;
            // Para vidas perdidas: cada vida perdida perde 10 pontos
            const pointsLost = lostLivesCount * 10;
            const totalPoints = pointsEliminated - pointsMissed - pointsLost;

            // Define fonte menor e usa a cor laranja igual à do header
            ctx.font = "20px Arial";
            ctx.fillStyle = "orange";

            // Exibe cada linha, totalizando os valores de cada item:
            ctx.fillText("Eliminados: " + eliminated + " (vale 2 pontos = " + pointsEliminated + ")", canvas.width / 2, canvas.height / 2 + 40);
            ctx.fillText("Tiros errados: " + missedShots + " (perde 1 ponto cada = " + (-pointsMissed) + ")", canvas.width / 2, canvas.height / 2 + 70);
            ctx.fillText("Vidas perdidas: " + lostLivesCount + " (perde 10 pontos cada = " + (-pointsLost) + ")", canvas.width / 2, canvas.height / 2 + 100);
            ctx.fillText("PONTOS TOTAIS: " + totalPoints, canvas.width / 2, canvas.height / 2 + 130);

            // Mensagem para reiniciar o jogo, 50px abaixo do relatório
            ctx.font = "24px Arial";
            ctx.fillStyle = "#fff";
            ctx.fillText("Pressione R para reiniciar", canvas.width / 2, canvas.height / 2 + 180);
        }
    } catch (e) {
        console.error("Erro na renderização:", e);
        // Tenta renderizar apenas os elementos essenciais na próxima vez
        reducedGraphics = true;
    }
}

// Substituir o event listener keydown atual:
document.addEventListener("keydown", (e) => {
    try {
        // Se o jogo não começou e a tecla espaço é pressionada
        if (!gameStarted && e.key === " ") {
            startGame();
            return;
        }

        if (e.key === "Escape") {
            if (!gameOver && !gameWon) {
                isPaused = !isPaused;
                console.log("Estado de pausa:", isPaused ? "PAUSADO" : "JOGANDO");
            }
        } else if (!gameOver && !gameWon && !isPaused) {
            // Movimento e tiro...
            if (e.key === "ArrowLeft") {
                player.movingLeft = true;
            } else if (e.key === "ArrowRight") {
                player.movingRight = true;
            } else if (e.key === " ") {
                // Tiro...
                const projectile = player.shoot(playerProjectiles.length);
                if (projectile) {
                    playerProjectiles.push(projectile);
                    if (soundManager) soundManager.playShootSound();
                }
            } else if (e.key === "m" || e.key === "M") {
                if (soundManager) soundManager.toggleMute();
            }
            // NOVO: Controle de volume
            else if (e.key === "ArrowUp") {
                if (soundManager) soundManager.increaseVolume();
            } else if (e.key === "ArrowDown") {
                if (soundManager) soundManager.decreaseVolume();
            }
        } else if (e.key === "r" || e.key === "R") {
            resetGame();
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

// Função para reiniciar o jogo
function resetGame() {
    try {
        moveInterval = 500;
        invaderShootInterval = 750;

        player = null;
        invaders = [];
        barriers = [];
        playerProjectiles = [];
        invaderProjectiles = [];
        gameOver = false;
        gameWon = false;
        invaderDirection = 1;
        moveAccumulator = 0;

        // Reset das variáveis de pontuação
        score = 0;               // Pontuação inicial zerada
        lostLivesCount = 0;      // Reset contador de vidas perdidas
        missedShots = 0;         // Reset contador de tiros perdidos

        init(); // Reinicia o jogo e mostra tela inicial

        // Redefine as variáveis de desempenho
        gamePerformance = {
            lastCleanup: 0,
            frameCount: 0,
            frameTime: 0,
            recoveryMode: false
        };

        // Mostra a tela inicial novamente
        renderStartScreen();

        // Garante que o jogador tenha as configurações corretas
        if (player) {
            player.lives = 3;
            player.maxProjectiles = 3;
            player.totalShotsFired = 0;
        }
    } catch (e) {
        console.error("Erro ao reiniciar o jogo:", e);
        // Forçar um recarregamento da página como último recurso
        location.reload();
    }
}

// Adicione esta função no final de cada update
function cleanupInactiveObjects() {
    try {
        // Limpa tiros inativos para economizar memória
        playerProjectiles = playerProjectiles.filter(p => p.active);
        invaderProjectiles = invaderProjectiles.filter(p => p.active);

        // Limpa invasores mortos se houver muitos (opcional)
        if (invaders.length > 100) { // Se por algum motivo tivermos muitos
            invaders = invaders.filter(i => i.alive);
        }
    } catch (e) {
        console.error("Erro na limpeza de objetos:", e);
        // Abordagem mais radical para recuperação
        playerProjectiles = [];
        invaderProjectiles = [];
    }
}

// Inicia o jogo quando a página for carregada
window.onload = init;
