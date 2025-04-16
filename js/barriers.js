/*
  barriers.js
  - Responsável por definir as barreiras de proteção do jogador.
  - Cada barreira é composta por tijolos, que podem ser danificados e destruídos quando atingidos.
*/

/* Classe que representa um único tijolo */
class Brick {
    // Definindo dimensões como propriedades estáticas da classe
    static WIDTH = 15;
    static HEIGHT = 10;

    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = Brick.WIDTH;   // Usando as propriedades estáticas
        this.height = Brick.HEIGHT;
        this.health = 1;    // Número de impactos para destruir o tijolo
    }

    takeDamage() {
        this.health--;
    }

    render(ctx) {
        if (this.health > 0) {
            ctx.fillStyle = "#8B4513"; // brown color
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

/* Classe que representa uma barreira composta por múltiplos tijolos */
class Barrier {
    constructor(x, y) {
        this.bricks = [];
        
        // 4 rows x 5 columns, totalizing 20 bricks per barrier
        const rows = 4;
        const cols = 5;
        
        // Usa as dimensões definidas na classe Brick
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                this.bricks.push(new Brick(
                    x + j * Brick.WIDTH, 
                    y + i * Brick.HEIGHT
                ));
            }
        }
    }

    render(ctx) {
        this.bricks.forEach(brick => brick.render(ctx));
    }
}
