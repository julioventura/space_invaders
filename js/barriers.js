/*
  barriers.js
  - Responsável por definir as barreiras de proteção do jogador.
  - Cada barreira é composta por tijolos, que podem ser danificados e destruídos quando atingidos.
*/

/* Classe que representa um único tijolo */
class Brick {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 15;    // Dimensões do tijolo
        this.height = 10;
        this.health = 1;    // Número de impactos para destruir o tijolo
    }

    takeDamage() {
        this.health--;
    }

    render(ctx) {
        if (this.health > 0) {
            ctx.fillStyle = "#f00";  // Cor vermelha para os tijolos
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

/* Classe que representa uma barreira composta por múltiplos tijolos */
class Barrier {
    constructor(x, y) {
        this.bricks = [];
        // Exemplo: 2 linhas x 5 colunas, totalizando 10 tijolos
        const rows = 2;
        const cols = 5;
        const brickWidth = 15;
        const brickHeight = 10;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                this.bricks.push(new Brick(x + j * brickWidth, y + i * brickHeight));
            }
        }
    }

    render(ctx) {
        this.bricks.forEach(brick => brick.render(ctx));
    }
}

// Se desejar tornar Barrier e Brick acessíveis globalmente:
// window.Barrier = Barrier;
// window.Brick = Brick;
