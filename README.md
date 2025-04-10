# Resumo do Projeto: Space Invaders Clone

## 1. Visão Geral do Jogo

O projeto é uma réplica simplificada do clássico Space Invaders dos anos 80. O jogo consiste em uma única tela (canvas) com um cenário dividido em diferentes zonas:

- **Área de Jogo:** Representada por um canvas com fundo preto.
- **Jogador:** Um canhão (em cor azul) posicionado na parte inferior da tela, que se move lateralmente (usando as teclas ArrowLeft e ArrowRight) e dispara tiros (tecla espaço).
- **Barreiras:** Quatro barreiras, cada uma composta por 10 tijolos vermelhos, localizadas próximas à parte inferior (nas linhas 2 a 4 do conceito de grid). Elas servem de proteção contra os tiros inimigos (e futuros do jogador).
- **Invasores:** Formados por 5 linhas com 11 invaders cada (total de 55), posicionados na parte superior do canvas.  
  - Os invasores se movem em passos discretos: a cada 1 segundo, a formação se desloca 10 pixels na direção atual.
  - Ao atingir a borda do canvas, a formação desce 10 pixels (um “passo” vertical) e inverte a direção do movimento.

## 2. Estrutura do Projeto

### Diretório e Arquivos

```
/meu-space-invaders
├── index.html          // Página principal: contém a estrutura HTML, o canvas e os links para CSS e JS.
├── css/
│    ├── style.scss     // Arquivo principal de estilos (SCSS) para op desenvolvimento da aparência do jogo
│    └── style.css      // Arquivo de estilos CSS compilado a partir do scss – define o layout
├── js/
│    ├── utils.js       // Funções utilitárias – ex.: detecção de colisões.
│    ├── player.js      // Define a classe Player – movimentação lateral e disparo.
│    ├── invader.js     // Define a classe Invader – propriedades e renderização do inimigo.
│    ├── barriers.js    // Define as classes Barrier e Brick – criação, renderização e danos das barreiras.
│    └── game.js        // Arquivo central – gerencia o game loop, atualização de estados, movimentação dos invasores, inputs e renderização.
└── assets/
     ├── imagens/       // Sprites e imagens (invasores, jogador, tijolos, etc.) – opcional.
     └── sons/          // Efeitos sonoros – opcional.
```

## 3. Regras e Comportamento do Jogo

### 3.1. Jogador

- **Posicionamento:** Fica na parte inferior do canvas (linha 1, conforme o conceito de grid).
- **Movimentação:**  
  - Pode mover-se para a esquerda e direita usando as teclas ArrowLeft e ArrowRight.
  - Restrições para não sair dos limites do canvas.
- **Disparo:**  
  - O espaço dispara um tiro (tendo apenas um tiro ativo por vez).
  - O tiro se move de forma contínua para cima e deverá ser removido quando sair dos limites ou ao colidir com um invasor ou tijolo.

### 3.2. Invasores

- **Formação:**  
  - 5 linhas x 11 colunas.
  - Iniciam alinhados à esquerda.
- **Movimento:**  
  - **Passo Horizontal:** A cada 1 segundo, a formação se move 10 pixels na direção atual (inicialmente para a direita).
  - **Verificação de Bordas:**  
    - Se o movimento de 10 pixels fizer o invasor mais à direita ultrapassar o limite do canvas, toda a formação desce 10 pixels e inverte a direção para a esquerda.
    - Se a formação estiver se movendo para a esquerda e o invasor mais à esquerda estiver próximo da borda, então desce 10 pixels e inverte para a direita.
- **Implementação:**  
  - Utilizar um acumulador de tempo (`moveAccumulator`) que, ao atingir 1000 ms, desencadeia um “passo” de movimento.
  - Calcular o invasor mais à esquerda e o mais à direita para determinar o comportamento.

### 3.3. Barreiras

- **Composição:**  
  - Cada barreira é composta por 10 tijolos (2 linhas x 5 colunas).
- **Funcionalidade:**  
  - Cada tijolo tem uma quantidade de "vida" (por exemplo, 1 impacto para ser destruído).
  - Quando um tiro colide com um tijolo, o tijolo sofre dano e é removido caso sua “vida” chegue a zero.

### 3.4. Colisões e Regras Adicionais

- **Colisões:**  
  - A função `isColliding()` (em utils.js) será usada para detectar se há interseção entre os retângulos que representam os objetos (tiros, invasores, tijolos).
- **Condições de Vitória e Derrota:**  
  - O jogador vence se destruir todos os invasores.
  - O jogo termina (derrota) se um invasor atingir a linha do jogador ou se um tiro inimigo atingir o jogador (implementação futura para tiros dos invasores).

## 4. Próximos Passos para a Implementação

### Passo 1: Teste do Game Loop e Renderização
- Verifique se, ao carregar a página, o canvas exibe corretamente:
  - O jogador (se movendo para os lados com as teclas).
  - As quatro barreiras.
  - A formação dos invasores (mesmo que estática inicialmente).
- Certifique-se de que o background esteja preto conforme especificado em `css/style.css`.

### Passo 2: Implementação da Lógica dos Invasores
- **Movimentação Discreta:**  
  - No arquivo `js/game.js`, implemente um acumulador de tempo (`moveAccumulator`).
  - A cada 1 segundo (1000 ms), execute um "passo":
    - Calcule a posição mínima e máxima (leftmost e rightmost) dos invasores vivos.
    - Se o invasor mais à direita, somado a 10 pixels, ultrapassar o limite direito do canvas, faça:
      - Descer toda a formação 10 pixels.
      - Inverter a direção para o movimento (mudar `invaderDirection` de 1 para -1).
    - Se o movimento para a esquerda ultrapassar o limite, execute o mesmo processo (descendo e invertendo).
    - Caso contrário, mova todos os invasores horizontalmente 10 pixels na direção atual.
  
### Passo 3: Implementação do Sistema de Tiros do Jogador
- Modifique o método `shoot()` na classe Player (em `js/player.js`) para que:
  - Ao pressionar a tecla espaço, seja criado um objeto Tiro (implementado ou a ser implementado).
  - O tiro se movimenta para cima a cada atualização do game loop.
  - O tiro deve ser removido quando sair do canvas ou ao ocorrer colisão com um invasor ou um tijolo da barreira.

### Passo 4: Implementação e Integração da Detecção de Colisões
- Utilize a função `isColliding()` (em `js/utils.js`) para:
  - Detectar colisões entre os tiros do jogador e os invasores.
  - Detectar colisões entre os tiros e os tijolos das barreiras.
- Remova ou marque como destruídos os invasores e tijolos atingidos.

### Passo 5 (Opcional): Implementar a Lógica para Tiros dos Invasores
- Após concluir o sistema de tiro do jogador e a movimentação dos invasores, implemente a lógica para que os invasores também possam disparar tiros descendentes.
- Verifique colisões dos tiros inimigos com o jogador.


# Conclusão

Este documento serve como um mapa completo para o desenvolvimento do clone do Space Invaders:

- **Estrutura do Projeto:**  
  Define os arquivos (HTML, CSS, JS) e a organização dos módulos (player, invader, barriers, game loop e utilitários).
  
- **Regras de Funcionamento:**  
  Estabelece como os elementos se movem (1 passo/segundo, verificação de bordas, inversão de direção e descida) e os comportamentos do jogador e das barreiras.
  
- **Próximos Passos:**  
  Desde testar o game loop e a renderização até implementar a lógica de movimento dos invasores e o sistema de tiros com detecção de colisões.


  
