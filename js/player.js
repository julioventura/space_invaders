/*
  player.js
  - Define a classe Player, que representa o canhão controlado pelo jogador.
  - Contém propriedades como posição, tamanho e velocidade.
  - Inclui métodos para movimentação (esquerda e direita) e para disparar.
*/

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y - 24; // Ajuste da posição inicial para compensar a altura maior
        this.width = 40;    // Largura do canhão
        this.height = 48;   // DOBRADO - era 24 pixels
        this.speed = 10;    // Velocidade de movimentação
        this.lives = 2;
        this.isBlinking = false;
        this.blinkTimer = 0;
        this.blinkInterval = 200;
        this.shooting = false;
        
        // O número máximo de tiros é igual ao número de vidas
        this.maxProjectiles = this.lives;

        // Sprite do canhão (16x16) - mantém o mesmo design, mas será esticado verticalmente
        this.sprite = [
            0x0000, // 0000000000000000
            0x0000, // 0000000000000000
            0x0000, // 0000000000000000
            0x0000, // 0000000000000000
            0x0000, // 0000000000000000
            0x0180, // 0000000110000000
            0x0180, // 0000000110000000
            0x0180, // 0000000110000000
            0x0180, // 0000000110000000
            0x0FF0, // 0000111111110000
            0x0FF0, // 0000111111110000
            0x0FF0, // 0000111111110000
            0x0FF0, // 0000111111110000
            0x3FFC, // 0011111111111100
            0x7FFE, // 0111111111111110
            0xFFFF  // 1111111111111111
        ];
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

    shoot(activeProjectilesCount) {
        // Verificar se já atingimos o limite de tiros simultâneos
        if (activeProjectilesCount < this.maxProjectiles) {
            // Cria um novo tiro no centro superior do jogador
            const projectileX = this.x + (this.width / 2) - 2;
            const projectileY = this.y; // Dispara da ponta do canhão
            this.shooting = true;
            return new Projectile(
                projectileX, 
                projectileY, 
                4,      // largura
                10,     // altura
                10,     // velocidade 
                1,      // direção (1 = para cima)
                "#0f0"  // cor verde
            );
        }
        return null;
    }

    resetShot() {
        this.shooting = false;
    }

    loseLife() {
        this.lives--;
        
        // Atualiza o número máximo de tiros com base nas vidas restantes
        this.maxProjectiles = this.lives; // Com 1 vida, só pode ter 1 tiro
        
        if (this.lives > 0) {
            // Se ainda tem vida, começa a piscar
            this.isBlinking = true;
        }
    }

    update(deltaTime) {
        // Atualiza o efeito de piscar quando na última vida
        if (this.isBlinking) {
            this.blinkTimer += deltaTime;
            if (this.blinkTimer > this.blinkInterval) {
                this.blinkTimer = 0;
            }
        }
    }

    render(ctx) {
        // Determina a cor baseada na vida e no estado de piscar
        if (this.isBlinking && this.blinkTimer < this.blinkInterval / 2) {
            ctx.fillStyle = "#FF0000"; // Vermelho para última vida
        } else {
            ctx.fillStyle = "#00FF00";  // Verde para o canhão (como no original)
        }
        
        // Desenha o sprite do canhão pixel por pixel
        const pixelSize = this.width / 16;
        const pixelHeight = this.height / 16; // Altura de cada pixel (agora maior)
        
        for (let row = 0; row < 16; row++) {
            for (let col = 0; col < 16; col++) {
                if ((this.sprite[row] >> (15 - col)) & 1) {
                    ctx.fillRect(
                        this.x + (col * pixelSize),
                        this.y + (row * pixelHeight), // Usa pixelHeight para esticar verticalmente
                        pixelSize,
                        pixelHeight
                    );
                }
            }
        }
    }
}

// Disponível globalmente, se necessário:
// window.Player = Player;
