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
const moveInterval = 500;  // Intervalo REDUZIDO para 500ms (era 1000ms)
const horizontalStep = 10;  // Distância do movimento horizontal a cada passo
const descentStep = 20;     // DOBRADO - era 10 pixels
let gameOver = false;
let gameWon = false;
let invaderShootTimer = 0;
let invaderShootInterval = 750; // REDUZIDO para 750ms (era 1500ms)
let isPaused = false; // Variável para controlar o estado de pausa

// Função de inicialização do jogo
function init() {
    // Constante para o tamanho do header
    const headerHeight = 42; // 40px header + 2px borda
    
    // Instancia o jogador com ajuste para o header
    player = new Player(canvas.width / 2 - 20, canvas.height - 40 + headerHeight/2);

    // Criação da formação de invasores com ajuste para o header
    const rows = 5;
    const cols = 11;
    const spacingX = 40;
    const spacingY = 30;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = col * spacingX + 20;
            const y = row * spacingY + 70 + headerHeight; // Ajustado para o header
            invaders.push(new Invader(x, y));
        }
    }

    // Criação de 4 barreiras com ajuste para o header
    const numBarriers = 4;
    for (let i = 0; i < numBarriers; i++) {
        const x = 50 + i * 150;
        const y = canvas.height - 150 + headerHeight/2;
        barriers.push(new Barrier(x, y));
    }

    // Inicia o game loop
    requestAnimationFrame(gameLoop);
}

// Game loop principal utilizando requestAnimationFrame
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // Só atualiza a lógica se o jogo não estiver pausado
    if (!isPaused) {
        update(deltaTime);
    }
    
    // Sempre renderiza, mesmo pausado (para mostrar mensagem de pausa)
    render();

    // Continue o loop se o jogo não acabou
    if (!gameOver && !gameWon) {
        requestAnimationFrame(gameLoop);
    }
}

// Função de atualização da lógica do jogo
function update(deltaTime) {
    // Atualiza o player (para o efeito de piscar)
    player.update(deltaTime);

    // Acumula o tempo decorrido
    moveAccumulator += deltaTime;

    // Se passou 500ms (0.5 segundo), executa um movimento de "passo"
    if (moveAccumulator >= moveInterval) {
        moveAccumulator = 0; // Resetar acumulador

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
                        // Os invasores sempre causam game over imediato se chegarem ao jogador
                        // independente do número de vidas
                        gameOver = true;
                    }
                    
                    // Alternar frame de animação
                    invader.toggleFrame();
                }
            });
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

    // Atualização dos tiros do jogador
    playerProjectiles.forEach(projectile => {
        projectile.update();
        
        // Verifica colisões com invasores
        invaders.forEach(invader => {
            if (invader.alive && projectile.active && isColliding(projectile, invader)) {
                invader.alive = false;
                projectile.active = false;
                player.resetShot();
            }
        });
        
        // Verifica colisões com tijolos das barreiras
        barriers.forEach(barrier => {
            barrier.bricks.forEach(brick => {
                if (brick.health > 0 && projectile.active && isColliding(projectile, brick)) {
                    brick.takeDamage();
                    projectile.active = false;
                    player.resetShot();
                }
            });
        });
    });
    
    // Remover tiros inativos
    playerProjectiles = playerProjectiles.filter(projectile => projectile.active);
    
    // Se o jogador não está atirando e um projectile está inativo, permitir novo tiro
    if (playerProjectiles.length === 0) {
        player.resetShot();
    }
    
    // Verificar vitória
    const remainingInvaders = invaders.filter(invader => invader.alive).length;
    if (remainingInvaders === 0) {
        gameWon = true;
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
        
        // Colisão com o jogador
        if (projectile.active && isColliding(projectile, player)) {
            projectile.active = false;
            
            // Agora o jogador perde uma vida em vez de game over imediato
            player.loseLife();
            if (player.lives <= 0) {
                gameOver = true;
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
}

// Função de renderização: desenha todos os elementos na tela
function render() {
    // Limpa o canvas (fundo preto)
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Adiciona um header destacado na parte superior
    ctx.fillStyle = "#222"; // Fundo cinza escuro para o header
    ctx.fillRect(0, 0, canvas.width, 40); // Barra de 40px de altura
    
    // Borda inferior para separar o header
    ctx.fillStyle = "#0F0";
    ctx.fillRect(0, 40, canvas.width, 2);
    
    // Informações no header
    ctx.fillStyle = "#FFF";
    ctx.font = "18px Arial";
    
    // Lado esquerdo - Contador de vidas
    ctx.textAlign = "left";
    ctx.fillText(`VIDAS: ${player.lives}`, 20, 25);
    
    // Centro - Nome do jogo
    ctx.textAlign = "center";
    ctx.font = "bold 22px Arial";
    ctx.fillText("SPACE INVADERS", canvas.width / 2, 25);
    
    // Lado direito - Dica de pausa
    ctx.textAlign = "right";
    ctx.font = "18px Arial";
    ctx.fillText("ESC para pausar", canvas.width - 20, 25);

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
   
    // Mostrar mensagem de pausa quando o jogo estiver pausado
    if (isPaused) {
        // Cria um fundo semi-transparente para a mensagem
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, canvas.height/2 - 50, canvas.width, 100);
        
        ctx.fillStyle = "#fff";
        ctx.font = "36px Arial";
        ctx.textAlign = "center";
        ctx.fillText("JOGO PAUSADO", canvas.width / 2, canvas.height / 2);
        
        ctx.font = "24px Arial";
        ctx.fillText("Pressione ESC para continuar", canvas.width / 2, canvas.height / 2 + 40);
    }
    
    // Se o jogo acabou, mostre as mensagens POR CIMA dos elementos
    if (gameOver || gameWon) {
        // Cria um fundo semi-transparente para a mensagem ser legível
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, canvas.height/2 - 50, canvas.width, 120);
        
        // Mostrar mensagem de fim de jogo
        ctx.fillStyle = "#fff";
        ctx.font = "36px Arial";
        ctx.textAlign = "center";
        
        if (gameWon) {
            ctx.fillText("VOCÊ VENCEU!", canvas.width / 2, canvas.height / 2);
        } else {
            ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
        }
        
        ctx.font = "24px Arial";
        ctx.fillText("Pressione R para reiniciar", canvas.width / 2, canvas.height / 2 + 50);
    }
}

// Captura de inputs do usuário via teclado
document.addEventListener("keydown", (e) => {
    if (!gameOver && !gameWon) {
        if (e.key === "Escape") {
            // Alternar estado de pausa
            isPaused = !isPaused;
        } else if (e.key === "ArrowLeft" && !isPaused) {
            player.moveLeft();
        } else if (e.key === "ArrowRight" && !isPaused) {
            player.moveRight();
        } else if (e.key === " " && !isPaused) {
            // Passa o número atual de tiros ativos para a função shoot
            const projectile = player.shoot(playerProjectiles.length);
            if (projectile) {
                playerProjectiles.push(projectile);
            }
        }
    } else if (e.key === "r" || e.key === "R") {
        // Reiniciar o jogo
        resetGame();
    }
});

// Função para reiniciar o jogo
function resetGame() {
    player = null;
    invaders = [];
    barriers = [];
    playerProjectiles = [];
    invaderProjectiles = [];
    gameOver = false;
    gameWon = false;
    invaderDirection = 1;
    moveAccumulator = 0;
    init();
}

// Inicia o jogo quando a página for carregada
window.onload = init;
