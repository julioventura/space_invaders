/*
  projectile.js
  - Define a classe Projectile que representa os tiros do jogador e dos invasores.
  - Contém propriedades como posição, tamanho, velocidade e direção.
  - Possui métodos para atualizar a posição e para renderizar o tiro.
*/

class Projectile {
    constructor(x, y, width, height, speed, direction, color) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = speed;  // Já ajustado na classe Player para tiros do jogador
        this.direction = direction; // 1 para cima (jogador), -1 para baixo (invasores)
        this.color = color;
        this.active = true;
    }

    update() {
        this.y -= this.direction * this.speed;
        
        // Desativa o tiro se ele sair da tela
        if (this.y < 0 || this.y > 600) {
            this.active = false;
        }
    }

    render(ctx) {
        if (this.active) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}