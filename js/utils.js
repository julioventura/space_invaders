/*
  utils.js
  - Contém funções utilitárias que auxiliam na execução do jogo.
  - Exemplo: função para detectar colisões entre dois retângulos.
*/

// Função para detecção de colisão entre dois retângulos
function isColliding(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

// Outras funções utilitárias poderão ser adicionadas aqui.

