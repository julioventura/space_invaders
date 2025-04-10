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
        this.width = 40;
        this.height = 20;
        this.speed = 8; // DOBRADO de 4 para 8 pixels por frame
        this.shooting = false;
        this.lives = 3;
        this.maxProjectiles = 3;
        this.totalShotsFired = 0;
        
        // Para efeito de piscar quando danificado
        this.blinking = false;
        this.blinkTimer = 0;
        this.blinkInterval = 200;
        this.blinkDuration = 0;
        this.visible = true;
        this.hitRecently = false;
        
        // Controle de movimento contínuo
        this.movingLeft = false;
        this.movingRight = false;
    }
    
    update(deltaTime) {
        // Atualiza o efeito de piscar
        if (this.blinking) {
            this.blinkTimer += deltaTime;
            
            if (this.blinkTimer >= this.blinkInterval) {
                this.blinkTimer = 0;
                this.visible = !this.visible;
            }
            
            // Termina o efeito após a duração definida
            this.blinkDuration -= deltaTime;
            if (this.blinkDuration <= 0) {
                this.blinking = false;
                this.visible = true;
            }
        }
    }
    
    moveLeft() {
        this.x = Math.max(0, this.x - this.speed);
    }
    
    moveRight() {
        this.x = Math.min(canvas.width - this.width, this.x + this.speed);
    }
    
    shoot(activeProjectilesCount) {
        // Verifica se o jogador pode atirar e se não ultrapassou o número máximo de tiros
        if (!this.shooting && activeProjectilesCount < this.maxProjectiles) {
            this.shooting = true;
            this.totalShotsFired++; // Incrementa o contador de tiros
            
            // Calcula a posição inicial do tiro (centro do canhão do jogador)
            const projectileX = this.x + (this.width / 2) - 2;
            const projectileY = this.y - 5;
            
            return new Projectile(
                projectileX, 
                projectileY, 
                4,                
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
        this.maxProjectiles = this.lives > 0 ? this.lives : 1; // Garantir pelo menos 1 tiro
        
        // Ativa o efeito de piscar
        this.blinking = true;
        this.blinkTimer = 0;
        this.blinkDuration = 3000; // Pisca por 3 segundos
        this.visible = false;
        this.hitRecently = true;
        
        return this.lives > 0;
    }
    
    render(ctx) {
        // Se estiver piscando e não estiver visível, não renderiza
        if (this.blinking && !this.visible) return;
        
        // Define a cor do canhão baseado nas vidas restantes
        let baseColor;
        if (this.lives === 1) {
            // Com 1 vida, o canhão fica vermelho
            baseColor = "#f00";
        } else {
            // Com 2 ou 3 vidas, o canhão é verde
            baseColor = "#0f0";
        }
        
        // Base principal (retangular)
        ctx.fillStyle = baseColor;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Canhão no formato retangular (como nas miniaturas)
        ctx.fillStyle = baseColor;
        ctx.fillRect(this.x + (this.width / 2) - 5, this.y - 10, 10, 10);
        
        // Detalhes da base (painéis laterais)
        const panelWidth = 10;
        const panelHeight = 5;
        
        // Painel esquerdo
        ctx.fillStyle = "#333";
        ctx.fillRect(this.x + 5, this.y + 5, panelWidth, panelHeight);
        
        // Painel direito
        ctx.fillRect(this.x + this.width - panelWidth - 5, this.y + 5, panelWidth, panelHeight);
        
        // Efeito de brilho na base do canhão
        ctx.fillStyle = "#fff";
        ctx.fillRect(this.x + this.width / 2 - 2, this.y - 2, 4, 2);
    }
}

// Disponível globalmente, se necessário:
// window.Player = Player;
