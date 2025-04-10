/*
  player.js
  - Define a classe Player, que representa o canhão controlado pelo jogador.
  - Contém propriedades como posição, tamanho e velocidade.
  - Inclui métodos para movimentação (esquerda e direita) e para disparar.
*/

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;    // Largura do canhão
        this.height = 20;   // Altura do canhão
        this.speed = 5;     // Velocidade de movimentação
        this.isShooting = false; // Controle para evitar múltiplos tiros simultâneos
    }

    moveLeft() {
        this.x -= this.speed;
        // Impedir que saia da tela (ajuste conforme tamanho do canvas)
        if (this.x < 0) this.x = 0;
    }

    moveRight() {
        this.x += this.speed;
        // Impedir que ultrapasse o limite do canvas
        if (this.x + this.width > 720) this.x = 720 - this.width;
    }

    shoot() {
        if (!this.isShooting) {
            this.isShooting = true;
            // A lógica para criar e gerenciar um tiro deve ser conectada no game.js
        }
    }

    render(ctx) {
        ctx.fillStyle = "#00f";  // Usa a cor azul do canhão
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// Disponível globalmente, se necessário:
// window.Player = Player;
