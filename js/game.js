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

// Adicione estas variáveis globais junto às outras no topo do arquivo
let countdownActive = false;
let countdownValue = 3;
let countdownTimer = 0;

// Adicione estas variáveis globais após as outras variáveis no topo do arquivo
let currentLevel = 1;
let maxLevel = 3;
let levelTransitionActive = false;
let levelTransitionTimer = 0;
let levelTransitionDuration = 3000; // 3 segundos de transição entre fases

function gameLoop(timestamp) {
    // Calcula o tempo decorrido desde o último frame
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    // Atualiza o estado do jogo
    if (!isPaused && !gameOver && !gameWon) {
        update(deltaTime);
    }

    // Renderiza o estado do jogo
    render();

    // Continua o loop
    requestAnimationFrame(gameLoop);
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
        const cols = 11; 
        const spacingX = 45; // Ajustado para melhor distribuição
        const spacingY = 33;
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
    ctx.fillText("Tecle ESPAÇO para iniciar e atirar", canvas.width / 2, canvas.height / 2.5);

    // Instruções de controle em tabela organizada
    ctx.font = "16px Arial";
    ctx.fillStyle = "#00FF00"; // Verde fósforo para as instruções
    const instructionsY = canvas.height * 2 / 4;

    // Desenha tabela sem bordas
    const rows = [
        ["←  →", "Mover a nave"],
        ["↑  ↓", "Volume +/-"],
        ["M", "Ligar/Desligar som"],
        ["ESC", "Pausar o jogo"],
        ["R", "Reiniciar o jogo"],
        ["DEL", "Zerar os recordes"]
    ];

    // Layout e estilo da tabela com altura aumentada
    const colWidth1 = 150;  // Largura da primeira coluna
    const colWidth2 = 200;  // Largura da segunda coluna
    const totalWidth = colWidth1 + colWidth2;
    const rowHeight = 25;
    const tableX = canvas.width / 2 - totalWidth / 2;
    const padding = 10;  // padding de 10px em todos os lados

    // Adiciona um fundo semi-transparente para a tabela (altura aumentada em 20px)
    // Calculando altura total: rows.length * rowHeight + padding * 2 + 20
    const tableHeight = rows.length * rowHeight + padding * 2 + 20;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(
        tableX - padding, 
        instructionsY - padding, 
        totalWidth + padding * 2, 
        tableHeight
    );

    // Desenha borda sutil ao redor da tabela (altura aumentada em 20px)
    ctx.strokeStyle = "rgba(0, 255, 0, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(
        tableX - padding, 
        instructionsY - padding, 
        totalWidth + padding * 2, 
        tableHeight
    );

    // Conteúdo
    ctx.fillStyle = "#00FF00"; // Verde fósforo para o conteúdo
    ctx.font = "16px Arial";
    rows.forEach((row, i) => {
        // Adiciona um efeito de pulsação nas teclas
        const pulseValue = (Math.sin(Date.now() * 0.002 + i * 0.5) + 1) * 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + pulseValue * 0.3})`;
        
        // Centraliza o texto da primeira coluna horizontalmente
        ctx.textAlign = "center";
        // Centraliza o texto verticalmente dentro da linha (adicionando 10px à posição Y)
        // O valor 10 é metade da altura adicional (20px / 2)
        ctx.fillText(row[0], tableX + (colWidth1 / 2), instructionsY + ((i + 1) * rowHeight) + 10);
        
        // Texto de ação em verde constante, alinhado à esquerda
        ctx.fillStyle = "#00FF00";
        ctx.textAlign = "left";
        // Centraliza o texto verticalmente (adicionando 10px à posição Y)
        ctx.fillText(row[1], tableX + colWidth1 + padding, instructionsY + ((i + 1) * rowHeight) + 10);
    });

    // Versão do jogo no rodapé
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Versão 1.02 (13/04/2025)", canvas.width / 2, canvas.height - 20);
}

// Remova o event listener de clique e use apenas a tecla espaço
if (canvas.hasClickEventListener) {
    canvas.removeEventListener('click', startGame);
    canvas.hasClickEventListener = false;
}

// Modifique a função startGame() para iniciar a contagem regressiva em vez de começar o jogo imediatamente
function startGame() {
    try {
        if (gameStarted || countdownActive) return;

        // Inicia a contagem regressiva em vez de começar o jogo imediatamente
        countdownActive = true;
        countdownValue = 3;
        countdownTimer = 0;
        
        // Inicia o loop de contagem regressiva
        requestAnimationFrame(countdownLoop);
    } catch (e) {
        console.error("Erro ao iniciar a contagem regressiva:", e);
        countdownActive = false;
    }
}

// Adicione esta nova função para o loop de contagem regressiva
function countdownLoop(timestamp) {
    try {
        // Limpa o canvas (fundo preto)
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Desenha o fundo de estrelas se disponível
        if (starImg.complete) {
            // Atualiza o offset para criar o efeito de movimento
            starOffset += starSpeed;
            if (starOffset > canvas.height) {
                starOffset = 0;
            }
            // Repete a imagem para preencher toda a tela verticalmente
            for (let y = -canvas.height; y < canvas.height; y += canvas.height) {
                ctx.drawImage(starImg, 0, starOffset + y, canvas.width, canvas.height);
            }
        }
        
        // Calcula o tempo decorrido
        if (countdownTimer === 0) {
            countdownTimer = timestamp;
        }
        
        const elapsed = timestamp - countdownTimer;
        
        // Atualiza o valor da contagem a cada segundo
        if (elapsed >= 500) {
            countdownValue--;
            countdownTimer = timestamp;
            
            // Toca um som de bipe, se disponível
            // if (soundManager) {
            //     soundManager.playInvaderStep(); // Ou outro som curto disponível
            // }
        }
        
        // Desenha o número da contagem regressiva
        ctx.fillStyle = "#00FF00";
        ctx.font = "bold 100px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // Animação de escala para tornar a contagem mais dinâmica
        const scale = 1 + 0.2 * Math.sin((elapsed % 1000) / 1000 * Math.PI);
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(scale, scale);
        ctx.fillText(countdownValue.toString(), 0, 0);
        ctx.restore();
        
        ctx.font = "24px Arial";
        ctx.fillText("Prepare-se...", canvas.width / 2, canvas.height / 2 + 80);
        
        // Se a contagem ainda não chegou a zero, continua o loop
        if (countdownValue > 0) {
            requestAnimationFrame(countdownLoop);
        } else {
            // Quando a contagem chega a zero, inicia o jogo de fato
            countdownActive = false;
            
            // Agora realmente inicia o jogo
            gameStarted = true;
            gameStartTime = performance.now();
            lastFrameTime = performance.now();
            
            // Ativa o sistema de som
            if (soundManager) {
                soundManager.activate();
                soundManager.playInvaderStep(); // Som para indicar o início
            }
            
            // Reseta o contador de tiros se necessário
            if (player) {
                player.totalShotsFired = 0;
            }
            
            // Inicia o loop de jogo
            requestAnimationFrame(gameLoop);
        }
    } catch (e) {
        console.error("Erro na contagem regressiva:", e);
        // Tenta iniciar o jogo diretamente em caso de erro
        countdownActive = false;
        gameStarted = true;
        requestAnimationFrame(gameLoop);
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
        // Verificar vitória
        const remainingInvaders = invaders.filter(invader => invader.alive).length;
        if (remainingInvaders === 0 && !gameWon && !levelTransitionActive) {
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

// Substituir o event listener keydown atual:
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
function checkHighScores() {
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
        updateFinalReport();
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
        // Obtém os recordes do localStorage
        let highScores = JSON.parse(localStorage.getItem("highScores")) || [];
        
        // Cálculo dos valores do relatório de pontuação:
        const eliminated = invaders.filter(invader => !invader.alive).length;
        const pointsEliminated = eliminated * 2;
        const pointsMissed = missedShots * 1;
        const pointsLost = lostLivesCount * 10;
        const totalPoints = pointsEliminated - pointsMissed - pointsLost;
        
        // Cria um container com display:flex para as duas colunas
        let html = `
            <div style="font-family: sans-serif; color: #00FF00; display: flex; 
                        flex-direction: row; justify-content: space-between; 
                        width: 90%; max-width: 720px; margin: 20px auto; 
                        background: rgba(0,0,0,0.7); padding: 20px; border-radius: 10px;">
                <!-- Coluna dos Recordes -->
                <div style="flex: 1; padding: 10px; text-align: center;">
                    <h3 style="margin-bottom: 10px; font-size: 18px;">RECORDES</h3>
                    <table style="width:100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr>
                                <th style="padding: 6px; border-bottom: 1px solid #00FF00;">Posição</th>
                                <th style="padding: 6px; border-bottom: 1px solid #00FF00;">Nome</th>
                                <th style="padding: 6px; border-bottom: 1px solid #00FF00;">Pontos</th>
                                <th style="padding: 6px; border-bottom: 1px solid #00FF00;">Data</th>
                            </tr>
                        </thead>
                        <tbody>`;
        
        // Adiciona cada recorde à tabela
        highScores.forEach((record, index) => {
            html += `
                <tr>
                    <td style="padding: 6px; text-align:center;">${index+1}</td>
                    <td style="padding: 6px; text-align:center;">${record.name}</td>
                    <td style="padding: 6px; text-align:center;">${record.score}</td>
                    <td style="padding: 6px; text-align:center;">${record.date}</td>
                </tr>`;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
                
                <!-- Coluna do Relatório de Pontuação -->
                <div style="flex: 1; padding: 10px; text-align: center;">
                    <h3 style="margin-bottom: 10px; font-size: 18px;">RELATÓRIO DE PONTUAÇÃO</h3>
                    <table style="width:100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr>
                                <th style="padding: 6px; border-bottom: 1px solid #00FF00;">Item</th>
                                <th style="padding: 6px; border-bottom: 1px solid #00FF00;">Quantidade</th>
                                <th style="padding: 6px; border-bottom: 1px solid #00FF00;">Valor</th>
                                <th style="padding: 6px; border-bottom: 1px solid #00FF00;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 6px; text-align:left;">Eliminados</td>
                                <td style="padding: 6px; text-align:center;">${eliminated}</td>
                                <td style="padding: 6px; text-align:center;">2</td>
                                <td style="padding: 6px; text-align:center;">${pointsEliminated}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px; text-align:left;">Tiros errados</td>
                                <td style="padding: 6px; text-align:center;">${missedShots}</td>
                                <td style="padding: 6px; text-align:center;">-1</td>
                                <td style="padding: 6px; text-align:center;">${-pointsMissed}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px; text-align:left;">Vidas perdidas</td>
                                <td style="padding: 6px; text-align:center;">${lostLivesCount}</td>
                                <td style="padding: 6px; text-align:center;">-10</td>
                                <td style="padding: 6px; text-align:center;">${-pointsLost}</td>
                            </tr>
                            <tr>
                                <td colspan="3" style="padding: 6px; text-align: right; border-top: 1px solid #00FF00;"><strong>PONTOS TOTAIS:</strong></td>
                                <td style="padding: 6px; text-align:center; border-top: 1px solid #00FF00;"><strong>${totalPoints}</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>`;
        
        // Insere o HTML combinado na div "highscore-table"
        const tableDiv = document.getElementById("highscore-table");
        if (tableDiv) {
            tableDiv.innerHTML = html;
            // Posiciona essa div dentro da tela final, centralizada
            tableDiv.style.position = "absolute";
            tableDiv.style.top = "30%";
            tableDiv.style.left = "50%";
            tableDiv.style.transform = "translate(-50%, 0)";
            tableDiv.style.zIndex = "100";
        }
    } catch (e) {
        console.error("Erro ao atualizar relatório final:", e);
    }
}

// Função para reiniciar o jogo
function resetGame() {
    try {
        // Reinicia a flag que controla o processamento dos recordes
        window.highScoreProcessed = false;
        
        // Reinicia o nível atual
        currentLevel = 1;
        levelTransitionActive = false;
        
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

// Modifique a função startNextLevel() para a fase 2

function startNextLevel() {
    try {
        // Limpa os projéteis da fase anterior
        playerProjectiles = [];
        invaderProjectiles = [];
        
        // Reinicia os invasores para a nova fase
        invaders = [];
        
        // Constante para o tamanho do header
        const headerHeight = 42;
        
        // Configurações específicas do nível 2
        if (currentLevel === 2) {
            // Velocidade 25% maior que a fase 1
            moveInterval = 375;  // 500 * 0.75 = 375
            invaderShootInterval = 560; // 750 * 0.75 = 562.5
            
            // NÃO restaura as barreiras (mantém as danificadas da fase 1)
            // O código de criação de barreiras foi removido daqui
            
            // Cria novos invasores com padrão diferente (formação em W)
            const rows = 5;
            const cols = 11;
            const spacingX = 45;
            const spacingY = 33;
            
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    // Formação em W para o nível 2
                    let offsetY = 0;
                    if (col === 0 || col === 10) {
                        offsetY = 0;
                    } else if (col === 1 || col === 9) {
                        offsetY = 15;
                    } else if (col === 2 || col === 8) {
                        offsetY = 30;
                    } else if (col === 3 || col === 7) {
                        offsetY = 15;
                    } else if (col === 4 || col === 6) {
                        offsetY = 0;
                    } else {
                        offsetY = 15;
                    }
                    
                    const x = col * spacingX + 35;
                    const y = row * spacingY + 70 + headerHeight + offsetY;
                    
                    // Velocidade de projétil ligeiramente mais alta na fase 2
                    invaders.push(new Invader(x, y, 30, 30, true, 4)); 
                }
            }
            
            // Reposiciona o jogador
            player.x = canvas.width / 2 - player.width / 2;
            
            // Reseta outros estados
            invaderDirection = 1;
            moveAccumulator = 0;
        }

        // Configurações específicas do nível 3 (NOVO)
        else if (currentLevel === 3) {
            // Velocidade 25% maior que a fase 2
            moveInterval = 280;  // 375 * 0.75 = 281.25
            // Mantém a mesma velocidade de tiro da fase 2
            invaderShootInterval = 560; // Igual à fase 2

            // NÃO restaura as barreiras (mantém as danificadas das fases anteriores)

            // Cria novos invasores com padrão de diamante para a fase final
            const rows = 5;
            const cols = 11;
            const spacingX = 45;
            const spacingY = 33;

            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    // Formação de diamante para o nível 3
                    let offsetY = 0;
                    const middleCol = Math.floor(cols / 2);
                    const distFromMiddle = Math.abs(col - middleCol);

                    if (row < 3) {
                        // Parte superior do diamante - desce à medida que se afasta do centro
                        offsetY = distFromMiddle * 15;
                    } else {
                        // Parte inferior do diamante - sobe à medida que se afasta do centro
                        offsetY = (5 - distFromMiddle) * 15;
                    }

                    const x = col * spacingX + 35;
                    const y = row * spacingY + 70 + headerHeight + offsetY;

                    // Mantém a mesma velocidade de projétil da fase 2
                    invaders.push(new Invader(x, y, 30, 30, true, 4));
                }
            }

            // Reposiciona o jogador
            player.x = canvas.width / 2 - player.width / 2;

            // Reseta outros estados
            invaderDirection = 1;
            moveAccumulator = 0;
        }        
    } catch (e) {
        console.error("Erro ao iniciar próximo nível:", e);
    }
}

// Modifique a criação de projéteis do jogador na classe Player (linha ~235-250):

// Se o jogador está atirando e não existe um projétil ativo, criar um novo
if (this.shooting && playerProjectiles.length < this.maxProjectiles) {
    // Criar um novo projétil
    const projectile = new Projectile(
        this.x + (this.width / 2) - 2,
        this.y - 10,
        4, 10, 3, 1, "#fff" // Velocidade reduzida de 5 para 3
    );
    playerProjectiles.push(projectile);
    this.totalShotsFired++;
    
    // Toca som de tiro
    if (soundManager) soundManager.playPlayerShootSound();
}

// Inicia o jogo quando a página for carregada
window.onload = init;
