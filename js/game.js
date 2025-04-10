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
let lastTime = 0;
let invaderDirection = 1; // 1 = direita, -1 = esquerda
let moveAccumulator = 0;  // Acumula tempo para mover os invasores em passos de 1 segundo
const horizontalStep = 10;  // Distância do movimento horizontal a cada passo
const descentStep = 10;     // Distância para descer quando a formação atinge a borda

// Função de inicialização do jogo
function init() {
    // Instancia o jogador na posição central na parte inferior
    player = new Player(canvas.width / 2 - 20, canvas.height - 40);

    // Criação da formação de invasores: 5 linhas x 11 colunas
    const rows = 5;
    const cols = 11;
    const spacingX = 40;
    const spacingY = 30;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = col * spacingX + 20;
            const y = row * spacingY + 50; // Ajuste para posicionamento vertical
            invaders.push(new Invader(x, y));
        }
    }

    // Criação de 4 barreiras distribuídas horizontalmente
    const numBarriers = 4;
    for (let i = 0; i < numBarriers; i++) {
        const x = 50 + i * 150;
        const y = canvas.height - 150;
        barriers.push(new Barrier(x, y));
    }

    // Inicia o game loop
    requestAnimationFrame(gameLoop);
}

// Game loop principal utilizando requestAnimationFrame
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    update(deltaTime);
    render();

    requestAnimationFrame(gameLoop);
}

// Função de atualização da lógica do jogo
function update(deltaTime) {
    // Acumula o tempo decorrido
    moveAccumulator += deltaTime;

    // Se passou 1 segundo, executa um movimento de "passo"
    if (moveAccumulator >= 1000) {
        moveAccumulator -= 1000;

        // Determina a posição dos invasores vivos para checar as bordas
        let leftmost = Infinity;
        let rightmost = -Infinity;
        invaders.forEach(invader => {
            if (invader.alive) {
                if (invader.x < leftmost) leftmost = invader.x;
                if (invader.x + invader.width > rightmost) rightmost = invader.x + invader.width;
            }
        });

        // Verifica se a formação atinge as bordas e inverte a direção, descendo uma linha
        if (invaderDirection > 0 && (rightmost + horizontalStep > canvas.width)) {
            // Atingiu a borda direita: desce e inverte direção
            invaders.forEach(invader => {
                invader.y += descentStep;
            });
            invaderDirection = -1;
        } else if (invaderDirection < 0 && (leftmost - horizontalStep < 0)) {
            // Atingiu a borda esquerda: desce e inverte direção
            invaders.forEach(invader => {
                invader.y += descentStep;
            });
            invaderDirection = 1;
        } else {
            // Movimento horizontal normal
            invaders.forEach(invader => {
                invader.x += invaderDirection * horizontalStep;
            });
        }
    }

    // Aqui você pode adicionar a atualização dos tiros, detecção de colisões, etc.
}

// Função de renderização: desenha todos os elementos na tela
function render() {
    // Limpa o canvas (fundo preto)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Renderiza o jogador
    player.render(ctx);

    // Renderiza os invasores
    invaders.forEach(invader => invader.render(ctx));

    // Renderiza as barreiras
    barriers.forEach(barrier => barrier.render(ctx));
}

// Captura de inputs do usuário via teclado
document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
        player.moveLeft();
    } else if (e.key === "ArrowRight") {
        player.moveRight();
    } else if (e.key === " ") {
        player.shoot();
    }
});

// Inicia o jogo quando a página for carregada
window.onload = init;
