/**
 * SHOOT! — Spanish.
 *
 * The English sentence on the left, the Spanish one on the right. There are no
 * identifiers in here on purpose — see the note at the top of src/core/i18n.js
 * for why the source text is the key.
 *
 * HOW TO ADD TO IT
 * ---------------------------------------------------------------------------
 *   - Copy the English string EXACTLY, punctuation and capitals included. A
 *     stray full stop is a missed lookup, and a missed lookup is a line of
 *     English on a Spanish screen.
 *   - `{placeholders}` must survive into the Spanish, and may move: Spanish
 *     puts its words where Spanish puts them. `{count} rounds` is
 *     `{count} balas`, but `Level {n}` is `Nivel {n}` and `sold for {gold}` is
 *     `vendido por {gold}`.
 *   - Keep the register. This game speaks like a western: short, dry, a little
 *     formal with strangers. Spanish gets the same voice — `tú` for the player,
 *     never `usted`, and no exclamation marks the English does not have.
 *   - Screaming caps in the English (`TAP`, `RELOAD`, `YOU DIED`) stay caps in
 *     the Spanish. They are drawn by a caps-only pixel font, and a lower-case
 *     source string measures the same but reads as a mistake in the source.
 *
 * A SENTENCE THAT IS NOT IN HERE IS NOT BROKEN
 * ---------------------------------------------------------------------------
 * `t` returns its argument when the lookup misses, so the worst an untranslated
 * line does is appear in English. That is the safety net; it is not a licence.
 * The game is meant to be entirely in Spanish when Spanish is picked.
 */

export const ES = {
  // -------------------------------------------------------------------------
  // The chrome: buttons, dialogs and the words that turn up on every screen
  // -------------------------------------------------------------------------
  Back: 'Atrás',
  Close: 'Cerrar',
  Cancel: 'Cancelar',
  Save: 'Guardar',
  Undo: 'Deshacer',
  Next: 'Siguiente',
  Play: 'Jugar',
  Join: 'Unirse',
  Create: 'Crear',
  Refresh: 'Actualizar',
  Buy: 'Comprar',
  Sell: 'Vender',
  Bought: 'Comprado',
  Saved: 'Guardado',
  Finished: 'Terminado',
  Locked: 'Bloqueado',
  Unlocked: 'Desbloqueado',
  Complete: 'Completado',
  Empty: 'Vacío',
  Unknown: 'Desconocido',
  Soon: 'Pronto',
  'Got it': 'Entendido',
  Esc: 'Esc',
  Enter: 'Intro',
  Escape: 'Escape',
  Keys: 'Teclas',
  All: 'Todo',
  You: 'Tú',
  Them: 'Ellos',
  Now: 'Ahora',
  Then: 'Después',
  Nothing: 'Nada',
  Everything: 'Todo',
  Test: 'Prueba',
  Sample: 'Muestra',
  Copied: 'Copiado',

  // -------------------------------------------------------------------------
  // Title screen and the main menu
  // -------------------------------------------------------------------------
  'Shoot! — Western Duels': '¡Shoot! — Duelos del Oeste',
  'Story Mode': 'Modo Historia',
  Online: 'En línea',
  Profile: 'Perfil',
  Settings: 'Ajustes',
  Achievements: 'Logros',
  'How to play': 'Cómo jugar',
  'How to Play': 'Cómo Jugar',
  Credits: 'Créditos',
  Wardrobe: 'Vestuario',
  Menu: 'Menú',
  'Main menu': 'Menú principal',
  'Back to the menu': 'Volver al menú',
  STRANGER: 'FORASTERO',

  // -------------------------------------------------------------------------
  // Settings
  // -------------------------------------------------------------------------
  Audio: 'Sonido',
  Game: 'Juego',
  Volume: 'Volumen',
  'How loud everything is.': 'Lo alto que suena todo.',
  Mute: 'Silenciar',
  'Silence the game entirely.': 'Deja el juego completamente mudo.',
  Muted: 'Silenciado',
  'Sound on': 'Con sonido',
  Language: 'Idioma',
  'Auto follows where you are riding from.': 'Auto sigue el sitio desde el que cabalgas.',
  'now: {language}': 'ahora: {language}',
  'Language: {language}': 'Idioma: {language}',
  'Screen shake': 'Vibración de pantalla',
  'Kick the camera when a shot lands.': 'Sacude la cámara cuando entra un disparo.',
  'Shake on gunfire': 'Vibrar con los disparos',
  Hints: 'Consejos',
  'Show tips and the first-run guide.': 'Muestra consejos y la guía de la primera partida.',
  'Show hints': 'Mostrar consejos',
  'The duel rules, any time you want them.': 'Las reglas del duelo, cuando quieras.',
  'Open guide': 'Abrir guía',

  // -------------------------------------------------------------------------
  // Profile
  // -------------------------------------------------------------------------
  'Gunslinger name': 'Nombre de pistolero',
  'Save name': 'Guardar nombre',
  'Name saved': 'Nombre guardado',
  'This device': 'Este dispositivo',
  'Saved on this device. Accounts arrive with online play.':
    'Guardado en este dispositivo. Las cuentas llegan con el juego en línea.',
  'Lifetime record': 'Historial completo',
  'Duels won': 'Duelos ganados',
  'Duels lost': 'Duelos perdidos',
  'Win rate': 'Victorias',
  'Worlds cleared': 'Mundos superados',
  'Change outfit': 'Cambiar atuendo',
  'Change your outfit': 'Cambia tu atuendo',

  // -------------------------------------------------------------------------
  // Wardrobe screen
  // -------------------------------------------------------------------------
  'Your gunslinger': 'Tu pistolero',
  Garments: 'Prendas',
  'Outfit saved': 'Atuendo guardado',
  'Most of this is earned, and the rest is sold at a clothing shop. Every locked piece says which.':
    'Casi todo esto se gana, y el resto se vende en una tienda de ropa. Cada pieza bloqueada dice cuál de las dos.',
  'Open wardrobe': 'Abrir vestuario',

  // -------------------------------------------------------------------------
  // Achievements screen
  // -------------------------------------------------------------------------
  'Achievements unlocked': 'Logros desbloqueados',
  'Achievement unlocked': 'Logro desbloqueado',
  'Bragging rights': 'Para presumir',
  'Kept on this device, alongside your profile — a run can end, these do not.':
    'Se guardan en este dispositivo, junto a tu perfil: una partida puede acabarse, estos no.',

  // -------------------------------------------------------------------------
  // Credits
  // -------------------------------------------------------------------------
  'Shoot!': '¡Shoot!',
  'Made by': 'Hecho por',
  'Built with': 'Hecho con',
  Thanks: 'Gracias',
  'The road here': 'El camino hasta aquí',
  'A turn-based western duel. Reload, shield, shoot — the whole game has lived in those three buttons for three years.':
    'Un duelo del Oeste por turnos. Recargar, cubrirse, disparar: el juego entero lleva tres años viviendo en esos tres botones.',
  'Design, code, pixel art and everything else — Pablo.':
    'Diseño, código, pixel art y todo lo demás — Pablo.',
  'Plain HTML, CSS and JavaScript modules. No frameworks, no build step, no binary assets — every sprite in the game is drawn from character maps at load time. Hosted on GitHub Pages.':
    'HTML, CSS y módulos de JavaScript a secas. Sin frameworks, sin compilación, sin recursos binarios: cada sprite del juego se dibuja a partir de mapas de caracteres al cargar. Alojado en GitHub Pages.',
  'Born as a shower thought. A crude prototype with an unreadable fancy font, thick black outlines and a wooden backdrop — but working multiplayer. Duels were over too quickly, so three lives and a western coat of paint were added.':
    'Nació como una idea bajo la ducha. Un prototipo tosco con una tipografía recargada e ilegible, contornos negros gruesos y un fondo de madera, pero con multijugador funcionando. Los duelos se acababan demasiado rápido, así que se añadieron tres vidas y una capa de pintura del Oeste.',
  'One enormous file, bots with no brains, and the first Story Mode: 3 worlds of 10 levels, experience, gold, random shops, inns that restored lives, scaling enemies, world bosses, common/rare/legendary items and three save slots.':
    'Un archivo enorme, bots sin cerebro y el primer Modo Historia: 3 mundos de 10 niveles, experiencia, oro, tiendas aleatorias, posadas que devolvían vidas, enemigos que escalaban, jefes de mundo, objetos comunes/raros/legendarios y tres ranuras de guardado.',
  'The most played one. Real animated western UI, sound, a battle overview with per-round statistics, purchasable abilities, revolver loot boxes, leaderboards, chat tags, daily quests, a half-finished clan system — and monetisation nobody bought. Long sessions got repetitive, and it was eventually put down.':
    'La más jugada. Interfaz del Oeste animada de verdad, sonido, un resumen de combate con estadísticas por ronda, habilidades comprables, cajas de botín con revólver, clasificaciones, etiquetas de chat, misiones diarias, un sistema de clanes a medio hacer y una monetización que no compró nadie. Las sesiones largas se volvían repetitivas, y acabó retirándose.',
  'Rebuilt from nothing on the open web. No level select: you walk, and the desert decides what you meet. Hunger, a horse, weather, a day that turns to night, a real inventory, seven worlds and whatever is waiting past the last one.':
    'Rehecho desde cero en la web abierta. Sin selector de niveles: caminas, y el desierto decide con qué te cruzas. Hambre, un caballo, clima, un día que se hace noche, un inventario de verdad, siete mundos y lo que sea que espere pasado el último.',
  'To the three or four friends who played the Roblox version every day when it was new. This one is the version that finally gets finished.':
    'A los tres o cuatro amigos que jugaban a la versión de Roblox todos los días cuando era nueva. Esta es la versión que por fin se termina.',
  'Three years, four versions, one duel. Thanks for playing.':
    'Tres años, cuatro versiones, un duelo. Gracias por jugar.',
  // -------------------------------------------------------------------------
  // Online — the finished interface, still waiting for a server
  // -------------------------------------------------------------------------
  'Not live': 'Sin conexión',
  'Online duels are still being built': 'Los duelos en línea todavía se están construyendo',
  'Everything below is the finished interface running on sample data. Nothing connects to anyone yet.':
    'Todo lo de abajo es la interfaz terminada funcionando con datos de ejemplo. Todavía no se conecta con nadie.',
  'Quick match': 'Partida rápida',
  'Quick Match': 'Partida Rápida',
  'Looking for a challenger…': 'Buscando a alguien que se atreva…',
  'Checking their trigger finger…': 'Comprobando su dedo en el gatillo…',
  'Saddling up…': 'Ensillando…',
  'Scanning the territory…': 'Rastreando el territorio…',
  Rooms: 'Salas',
  'The room browser': 'La lista de salas',
  'Create room': 'Crear sala',
  'Create Room': 'Crear Sala',
  'Creating a room': 'Crear una sala',
  'Joining a room': 'Unirse a una sala',
  'Joining by code': 'Unirse por código',
  'Join with a code': 'Unirse con un código',
  'Room name': 'Nombre de la sala',
  'Room code': 'Código de sala',
  'Six characters, from whoever made the room.': 'Seis caracteres, de quien haya creado la sala.',
  'Starting lives': 'Vidas iniciales',
  'Best of 3': 'Al mejor de 3',
  'Best of 5': 'Al mejor de 5',
  'Sudden death': 'Muerte súbita',
  'Free-for-all (4)': 'Todos contra todos (4)',
  '3 lives': '3 vidas',
  '5 lives': '5 vidas',
  '1 life': '1 vida',
  'Private — join by code only': 'Privada: solo se entra con código',
  'High Noon Lobby': 'Sala del Mediodía',
  'Rusty Spur Saloon': 'Cantina Espuela Oxidada',
  "Dead Man's Gulch": 'Barranco del Muerto',
  'Coyote Ridge': 'Loma del Coyote',
  'Silver Vein Mine': 'Mina de la Veta de Plata',
  'Buzzard Flats': 'Llanos del Buitre',
  'The Last Round': 'La Última Ronda',
  Mode: 'Modo',

  // -------------------------------------------------------------------------
  // Save slots
  // -------------------------------------------------------------------------
  'New run': 'Partida nueva',
  'Ride out': 'Salir a cabalgar',
  'Erase this run': 'Borrar esta partida',
  'Erase this run?': '¿Borrar esta partida?',
  'Progress saves itself after every encounter, and again whenever you leave from the road. Die out there and the slot is erased.':
    'La partida se guarda sola después de cada encuentro, y otra vez cada vez que te retiras desde el camino. Si mueres ahí fuera, la ranura se borra.',
  Normal: 'Normal',
  Hard: 'Difícil',
  'The road as it was built. Long, and it kills most runs.':
    'El camino tal y como se construyó. Largo, y se lleva por delante casi todas las partidas.',
  'The same road, and nothing on it is on your side.':
    'El mismo camino, y nada de lo que hay en él está de tu parte.',
  'A body is worth more gold out here. It does not cover it.':
    'Un cadáver vale más oro aquí fuera. Ni de lejos lo compensa.',
  'Bosses are bigger, more riders carry a trick, and more of them carry the heavier gun.':
    'Los jefes son más grandes, más jinetes llevan un truco, y más de ellos llevan el arma pesada.',
  'Every counter asks about half again — the stall, the inn and the forge — and half-price tags are rare.':
    'Todos los mostradores piden casi la mitad más —el puesto, la posada y la fragua— y las rebajas escasean.',
  'Every gun on this road is one rung further up the ladder. A Dust Flats rider carries the Prairie\'s.':
    'Cada arma de este camino está un peldaño más arriba. Un jinete de los Llanos de Polvo lleva la de la Pradera.',
  'Med kits, bottles, meals and the Dusk Totem are all worth less than they say.':
    'Los botiquines, los frascos, las comidas y el Tótem del Ocaso valen menos de lo que dicen.',
  'Riders carry more life, and the man across the road reads a repeated move off two instead of three.':
    'Los jinetes llevan más vida, y el hombre de enfrente te lee un movimiento repetido a las dos veces en vez de a las tres.',
  'The cheap bed puts back less, and the expensive one no longer restores every life.':
    'La cama barata devuelve menos, y la cara ya no te cura todas las vidas.',

  // -------------------------------------------------------------------------
  // Between worlds: the intro card, the victory screen, the game over
  // -------------------------------------------------------------------------
  'Click anywhere to ride on': 'Haz clic donde sea para seguir',
  'Click to ride on': 'Haz clic para seguir',
  'You went down': 'Has caído',
  'Start again': 'Empezar otra vez',
  Distance: 'Distancia',
  'Gold earned': 'Oro ganado',
  'Level reached': 'Nivel alcanzado',
  'Lives restored': 'Vidas recuperadas',
  'Hard road': 'Camino difícil',
  'Leaving from the road saves. Dying does not — there is nothing to pick back up.':
    'Retirarte desde el camino guarda la partida. Morir no: no queda nada que recoger.',
  'The hard road is open. Start a new slot and pick it from the mode list.':
    'El camino difícil está abierto. Empieza una ranura nueva y elígelo en la lista de modos.',

  // -------------------------------------------------------------------------
  // The hard road announcement
  // -------------------------------------------------------------------------
  HARD: 'DIFÍCIL',
  'Hard mode unlocked': 'Modo difícil desbloqueado',
  'THE ROAD, WITH NOTHING ON YOUR SIDE': 'EL CAMINO, SIN NADA DE TU PARTE',
  'Seven worlds. Every one of them behind you.': 'Siete mundos. Todos ellos a tu espalda.',
  'The Stranger laid that road out easy, and you still nearly died on it.':
    'El Forastero puso ese camino fácil, y aun así casi te mata.',
  'There is another one under it. Nobody has walked that one.':
    'Hay otro debajo. Ese no lo ha caminado nadie.',
  'Finish it and the Ember Reaver is yours — the coat, the tack, and the fire on both.':
    'Termínalo y el Saqueador de Brasas es tuyo: el abrigo, los arreos y el fuego en los dos.',
  // -------------------------------------------------------------------------
  // The road: the travel band, hunger, weather
  // -------------------------------------------------------------------------
  Map: 'Mapa',
  'See the road ahead': 'Mira el camino que viene',
  'You are not carrying a map': 'No llevas ningún mapa',
  'The road ahead is blank': 'El camino de delante está en blanco',
  'Eat, use or sell what you are carrying': 'Come, usa o vende lo que llevas',
  'Open the workbench': 'Abrir el banco de trabajo',
  'Leave the road?': '¿Dejar el camino?',
  'Your run is written to its slot as it stands right now, and you can pick it up from the same slot whenever you like. Only dying loses it.':
    'Tu partida se escribe en su ranura tal y como está ahora mismo, y puedes retomarla desde esa misma ranura cuando quieras. Solo se pierde muriendo.',
  Admin: 'Admin',
  Starving: 'Muriendo de hambre',
  'Starving — eat something': 'Muriendo de hambre: come algo',
  'You are getting hungry': 'Te está entrando hambre',
  'Eat before it runs out — starving costs you a life at a time':
    'Come antes de que se acabe: el hambre te cuesta una vida cada vez',
  ' and ': ' y ',

  Clear: 'Despejado',
  Overcast: 'Nublado',
  Rain: 'Lluvia',
  Fog: 'Niebla',
  Sandstorm: 'Tormenta de arena',
  Snowfall: 'Nevada',
  Ashfall: 'Lluvia de ceniza',
  Gloom: 'Penumbra',
  Starfall: 'Lluvia de estrellas',
  Weather: 'Clima',
  'Clouds are gathering': 'Se están juntando las nubes',
  'Rain is coming down': 'Está cayendo la lluvia',
  'Mist settles over the grass': 'La bruma se posa sobre la hierba',
  'Sand whips across the road': 'La arena azota el camino',
  'Snow is coming down over the pass': 'Está nevando sobre el puerto',
  'Ash is falling across the basin': 'Cae ceniza por toda la cuenca',
  'The light is going out of the day': 'Se está yendo la luz del día',
  'Something is falling through the dark': 'Algo está cayendo a través de la oscuridad',

  // -------------------------------------------------------------------------
  // The saddlebag
  // -------------------------------------------------------------------------
  Saddlebag: 'Alforja',
  Duel: 'Duelo',
  'In hand for the next fight': 'En mano para la próxima pelea',
  'Nothing selected': 'No has elegido nada',
  'Pick something from the bag to see what it does.':
    'Elige algo de la alforja para ver qué hace.',
  'Sell one for half its shop price': 'Vende uno por la mitad de su precio de tienda',
  'That hits the spot': 'Eso entra bien',
  'Bag full': 'Alforja llena',

  // -------------------------------------------------------------------------
  // The trail map
  // -------------------------------------------------------------------------
  'Trail map': 'Mapa del camino',
  'Trail Map': 'Mapa del Camino',
  'Drag to move · scroll to zoom': 'Arrastra para mover · rueda para acercar',
  'Find me': 'Encuéntrame',
  'Zoom in': 'Acercar',
  'Zoom out': 'Alejar',
  Shop: 'Tienda',
  Forge: 'Fragua',
  Clothier: 'Ropero',
  Inn: 'Posada',

  // The signs over the roadside buildings, drawn in the pixel font. Short on
  // purpose: the boards they are painted on are 42 to 52 pixels wide.
  SHOP: 'TIENDA',
  INN: 'POSADA',
  FORGE: 'FRAGUA',
  DUDS: 'ROPA',

  // -------------------------------------------------------------------------
  // Shops, inns, the forge and the clothier
  // -------------------------------------------------------------------------
  'General Store': 'Almacén General',
  Blacksmith: 'Herrero',
  'Not yet forged': 'Aún sin forjar',
  'Dry Goods': 'Mercería',
  'The rail is bare. You already own everything this trade sells.':
    'La percha está vacía. Ya tienes todo lo que vende este oficio.',
  'Whatever you buy here is yours for good — it is waiting in the wardrobe, whatever happens to this run.':
    'Lo que compres aquí es tuyo para siempre: te espera en el vestuario, pase lo que pase con esta partida.',
  'Basic Bed': 'Cama sencilla',
  'Premium Bed': 'Cama buena',
  Sleep: 'Dormir',
  'Slept here': 'Has dormido aquí',
  'Lives full': 'Vidas al máximo',
  Restores: 'Recupera',
  'You are already well rested': 'Ya estás bien descansado',

  // -------------------------------------------------------------------------
  // How to Play
  // -------------------------------------------------------------------------
  'You and your rival choose at the same time. Nobody sees the other move first.':
    'Tu rival y tú elegís a la vez. Nadie ve primero el movimiento del otro.',
  'Puts one round in the cylinder. You are open to a shot while you do it.':
    'Mete una bala en el tambor. Mientras lo haces estás expuesto a un disparo.',
  'Needs a loaded round. Wasted on someone who shielded.':
    'Necesita una bala cargada. Se desperdicia contra alguien que se ha cubierto.',
  'Blocked. Their round is wasted.': 'Bloqueado. Su bala se pierde.',
  'Blocked. Your round is wasted.': 'Bloqueado. Tu bala se pierde.',
  'Nothing happens. You both gain a round.': 'No pasa nada. Los dos ganáis una bala.',
  'Their shot lands on you.': 'Su disparo te alcanza.',
  'Your shot lands on them.': 'Tu disparo les alcanza.',
  'You both take a hit.': 'Los dos encajáis un impacto.',
  'What beats what': 'Qué gana a qué',
  'The rest': 'Lo demás',
  'Lives are red diamonds. Yours on the left, theirs on the right.':
    'Las vidas son diamantes rojos. Los tuyos a la izquierda, los suyos a la derecha.',
  'The first one out of lives loses the duel.': 'El primero que se queda sin vidas pierde el duelo.',
  'Watch their cylinder. An empty gun cannot shoot you; a full one usually will.':
    'Vigila su tambor. Un arma vacía no puede dispararte; una llena casi siempre lo hará.',
  'On the road, hunger drains as you walk. At zero it costs lives fast — faster the longer your life bar is.':
    'En el camino, el hambre baja mientras andas. A cero te cuesta vidas rápido, y más rápido cuanto más larga sea tu barra.',
  'The map shows the next five stops. The road past them is decided as you walk it.':
    'El mapa enseña las cinco paradas siguientes. El camino a partir de ahí se decide según lo andas.',
  // -------------------------------------------------------------------------
  // The duel
  // -------------------------------------------------------------------------
  Reload: 'Recargar',
  Shield: 'Cubrirse',
  Shoot: 'Disparar',
  Boss: 'Jefe',
  Safe: 'A salvo',
  Jammed: 'Encasquillada',
  Night: 'Noche',
  Result: 'Resultado',
  Hits: 'Impactos',
  Accuracy: 'Puntería',
  'Shots fired': 'Disparos hechos',
  'Lives left': 'Vidas restantes',
  'Round 1': 'Ronda 1',
  'Round by round': 'Ronda a ronda',
  'Battle overview': 'Resumen del combate',
  'Choose your move': 'Elige tu movimiento',
  'Both of you draw…': 'Los dos desenfundáis…',
  'Load one round. You are open to a shot this turn.':
    'Carga una bala. Este turno estás expuesto a un disparo.',
  'Nothing gets through. You gain nothing either.':
    'No pasa nada a través. Tú tampoco ganas nada.',
  'Spend one round. Hits a rival who reloaded or shot.':
    'Gasta una bala. Alcanza al rival que haya recargado o disparado.',
  'Eat something, or patch yourself up': 'Come algo, o cúrate',
  'Nothing doing': 'Nada que hacer',
  'That finished it': 'Eso lo ha rematado',
  'They are not finished…': 'No han terminado…',
  'You hit them!': '¡Les has dado!',
  'They hit you!': '¡Te han dado!',
  'You both go down a life': 'Los dos perdéis una vida',
  'You both reload': 'Los dos recargáis',
  'You blocked it': 'Lo has bloqueado',
  'They spent their turn on that': 'Han gastado su turno en eso',
  'They scrambled for their belt': 'Han rebuscado en el cinturón',
  'They shot wide': 'Han disparado desviado',
  'You could not see — wide': 'No veías: desviado',
  'Your gun is empty': 'Tu arma está vacía',
  'Your gun will not fire': 'Tu arma no dispara',
  'Their gun will not fire': 'Su arma no dispara',
  'Wet powder — misfire!': 'Pólvora mojada: ¡se ha encasquillado!',
  'The blast knocked a round out of your gun': 'La explosión te ha sacado una bala del arma',
  'The ground took you': 'El suelo te ha atrapado',
  'You are frozen solid': 'Estás congelado del todo',
  'They cannot move': 'No pueden moverse',
  'They aim worse in the dark': 'En la oscuridad apuntan peor',
  'Caught by their trick!': '¡Te ha pillado su truco!',
  'The diadem blocked it': 'La diadema lo ha bloqueado',
  'Their mirror sent it back at you': 'Su espejo te lo ha devuelto',
  'Your mirror sent it back!': '¡Tu espejo se lo ha devuelto!',
  'Your vest took the hit — you patch it up on the road':
    'Tu chaleco ha aguantado el golpe: lo remiendas en el camino',
  'The totem is gone. You are not': 'El tótem ya no está. Tú sí',
  'The totem broke instead of you': 'El tótem se rompió en tu lugar',
  'You cannot walk out of a fight': 'No puedes marcharte de una pelea',

  // Duel state chips — what is currently on you or on them
  'Blocked — bullet wasted': 'Bloqueado: bala desperdiciada',
  'Blocked by diadem': 'Bloqueado por la diadema',
  'Blinded — shots go wide': 'Cegado: los disparos se desvían',
  'Frozen — they do nothing at all': 'Congelado: no hacen absolutamente nada',
  'Jammed — cannot shoot': 'Encasquillada: no puede disparar',
  'Loaded — shots cost them one more': 'Cargado: cada disparo les cuesta una más',
  'Marked — every shot that lands costs one more':
    'Marcado: cada disparo que entra cuesta una más',
  'Mirrored — it went back at them': 'Reflejado: les ha vuelto a ellos',
  'Mirrored — the next shot goes back': 'Reflejado: el próximo disparo vuelve',
  'Panicked — their shield stops nothing': 'Presa del pánico: su escudo no para nada',
  'Poisoned — a life every round': 'Envenenado: una vida por ronda',
  'Vest — stops one hit a duel': 'Chaleco: para un impacto por duelo',
  'Diadem — effects cannot touch you': 'Diadema: los efectos no pueden tocarte',
  'Dusk Totem — when the last life goes, it breaks instead of you':
    'Tótem del Ocaso: cuando se va la última vida, se rompe él en tu lugar',
  'ESC TO SKIP': 'ESC PARA SALTAR',

  // -------------------------------------------------------------------------
  // The dusk totem breaking
  // -------------------------------------------------------------------------
  // The prompt under the totem. It is the same word in both languages on
  // purpose — see the note in src/ui/totem.js. TOCA would read as an
  // instruction; TAP is what a thumb already understands.
  TAP: 'TAP',
  'The dusk totem': 'El tótem del ocaso',
  'IT BREAKS INSTEAD OF YOU': 'SE ROMPE EN TU LUGAR',
  // -------------------------------------------------------------------------
  // The catalogue: food, healing, tools and the things worn into a duel
  // -------------------------------------------------------------------------
  Carrot: 'Zanahoria',
  'Restores 20% hunger. Cheap and always in stock.':
    'Recupera un 20% de hambre. Barata y siempre disponible.',
  Apple: 'Manzana',
  'Restores 40% hunger.': 'Recupera un 40% de hambre.',
  'Trail Stew': 'Guiso de camino',
  'A full pot. Fills the hunger gauge to the top, whatever was left in it.':
    'Una olla entera. Llena el medidor de hambre hasta arriba, quedara lo que quedara.',
  "Traveller's Feast": 'Festín del viajero',
  'Fills the gauge, and you ride out of it well fed: the next three duels start with two rounds already loaded.':
    'Llena el medidor, y sales de ahí bien comido: los tres duelos siguientes empiezan con dos balas ya cargadas.',
  'Well fed': 'Bien comido',
  Bandage: 'Venda',
  'Patches you up for 2 lives.': 'Te remienda 2 vidas.',
  'Med Kit': 'Botiquín',
  'Field surgery in a tin box. Puts half of you back together.':
    'Cirugía de campaña en una caja de hojalata. Te recompone la mitad.',
  Potion: 'Frasco',
  'Three extra lives in gold, hung on the end of your bar. Nothing heals them, they are spent before your own, and another bottle adds three more.':
    'Tres vidas de más en oro, colgadas al final de tu barra. Nada las cura, se gastan antes que las tuyas, y otro frasco añade tres más.',
  'Bulletproof Vest': 'Chaleco antibalas',
  'Worn over the shirt. Stops the first thing that hits you in a duel — a bullet, a blast, a rock — and you patch it up before the next one.':
    'Se lleva sobre la camisa. Para lo primero que te alcance en un duelo —una bala, una explosión, una piedra— y lo remiendas antes del siguiente.',
  'Anti-Effect Diadem': 'Diadema antiefectos',
  'While worn, enemy abilities have no effect on you.':
    'Mientras la lleves puesta, las habilidades enemigas no te hacen nada.',
  'Dusk Totem': 'Tótem del Ocaso',
  'When the last life goes, it breaks instead of you: back on half your lives, and back on the road. One use.':
    'Cuando se va la última vida, se rompe él en tu lugar: vuelves con la mitad de tus vidas, y vuelves al camino. Un solo uso.',
  Canteen: 'Cantimplora',
  'Water for the road. Hunger drains a third slower, for the rest of the run.':
    'Agua para el camino. El hambre baja un tercio más despacio durante el resto de la partida.',
  Horse: 'Caballo',
  'Ride instead of walk. Halves travel time — and the food a crossing costs with it.':
    'Cabalga en vez de andar. Reduce a la mitad el tiempo de viaje, y con él la comida que cuesta cada travesía.',
  'Trader\'s Ledger': 'Libro de cuentas',
  'Every shop from now on displays one extra item.':
    'Todas las tiendas a partir de ahora enseñan un objeto más.',
  'Silver Tongue': 'Labia de plata',
  'Discounts appear far more often in shops and inns.':
    'Los descuentos aparecen mucho más a menudo en tiendas y posadas.',
  'Opens the trail map: every duel, shop, inn and boss on the road ahead. Never runs out.':
    'Abre el mapa del camino: cada duelo, tienda, posada y jefe que hay por delante. No se gasta nunca.',

  // -------------------------------------------------------------------------
  // The ladder of guns
  // -------------------------------------------------------------------------
  'Trail Sixgun': 'Seis Tiros del Camino',
  'The gun you rode in with. Honest, and nothing more than that.':
    'El arma con la que llegaste. Honesta, y nada más que eso.',
  'Trail Iron': 'Hierro del Camino',
  'Drawn down, re-hardened and hammered true. It no longer flinches.':
    'Estirada, vuelta a templar y martillada recta. Ya no se estremece.',
  'Brass Sixgun': 'Seis Tiros de Latón',
  'A hand-poured brass frame on a barrel three inches longer than the law likes.':
    'Una armazón de latón fundida a mano sobre un cañón tres pulgadas más largo de lo que a la ley le gusta.',
  'Brass Longbarrel': 'Cañón Largo de Latón',
  'Steel Longbarrel': 'Cañón Largo de Acero',
  'Tempered Steel': 'Acero Templado',
  'Bone Longbarrel': 'Cañón Largo de Hueso',
  'Silvered, scrimshawed, and cold enough in the hand to steady it.':
    'Plateado, grabado en hueso, y lo bastante frío en la mano como para estabilizarla.',
  Emberbore: 'Ánima de Brasa',
  'Never fully cooled. The bore still carries the colour of the fire it was cut in.':
    'Nunca se enfrió del todo. El ánima aún lleva el color del fuego en el que se cortó.',
  'Bone Nova': 'Nova de Hueso',
  'Re-forged around something that fell. It hums when the sky is clear.':
    'Reforjada alrededor de algo que cayó. Zumba cuando el cielo está despejado.',
  'Void Nova': 'Nova del Vacío',
  'A hole in the sky, held in one hand. Nothing on this road was built to take it.':
    'Un agujero en el cielo, sujeto con una mano. Nada en este camino se construyó para aguantarla.',

  // -------------------------------------------------------------------------
  // The seven worlds and the ground they are made of
  // -------------------------------------------------------------------------
  'Dust Flats': 'Llanos de Polvo',
  'Wildgrass Prairie': 'Pradera de Hierba Brava',
  'Blackwater Bayou': 'Ciénaga de Agua Negra',
  'Gallows Hollow': 'Hondonada del Patíbulo',
  'Whitecrown Pass': 'Puerto Corona Blanca',
  'Brimstone Basin': 'Cuenca de Azufre',
  Galaxy: 'Galaxia',
  'Where every story starts': 'Donde empieza toda historia',
  'Green country, and none of it yours': 'Tierra verde, y nada de ella es tuya',
  'The water keeps what it takes': 'El agua se queda con lo que se lleva',
  'Nothing down here stayed buried': 'Aquí abajo nada se quedó enterrado',
  'Above the trees, under the storm': 'Por encima de los árboles, bajo la tormenta',
  'Hell got tired of waiting': 'El infierno se cansó de esperar',
  'Past the last horizon': 'Más allá del último horizonte',

  Desert: 'Desierto',
  Prairie: 'Pradera',
  Bayou: 'Ciénaga',
  Hollow: 'Hondonada',
  Pass: 'Puerto',
  Basin: 'Cuenca',
  'The Void': 'El Vacío',

  // -------------------------------------------------------------------------
  // The Stranger, at the end of the last road
  // -------------------------------------------------------------------------
  'THE STRANGER': 'EL FORASTERO',
  'A gun is a small thing to carry that far.': 'Un arma es poca cosa para llevarla tan lejos.',
  'Seven worlds. Seven roads. I laid every one of them for you.':
    'Siete mundos. Siete caminos. Los puse todos para ti.',
  'You buried the men I sent. You ate, you slept, you grew.':
    'Enterraste a los hombres que mandé. Comiste, dormiste, creciste.',
  'I did not walk it to stand still at the end of it.':
    'No lo he caminado para quedarme quieto al final.',
  'No. You walked it so I could see what I made.':
    'No. Lo caminaste para que yo viera lo que hice.',
  'Draw.': 'Desenfunda.',
  // -------------------------------------------------------------------------
  // Tricks: what a rider can call up in the middle of a duel
  //
  // The shouted banners keep their exclamation marks and their capitals — they
  // are drawn across the duel in the pixel font, and they are the loudest thing
  // in the game.
  // -------------------------------------------------------------------------
  Damage: 'Daño',
  'Damage over time': 'Daño con el tiempo',
  Control: 'Control',
  Curse: 'Maldición',
  Theft: 'Robo',
  Trade: 'Trueque',
  Poison: 'Veneno',
  Buff: 'Mejora',
  Guard: 'Guardia',

  'Dust Devil': 'Remolino de Polvo',
  'DUST DEVIL!': '¡REMOLINO DE POLVO!',
  'Raises a twister for the rest of the duel. It sweeps the road every 22 seconds':
    'Levanta un torbellino para el resto del duelo. Barre el camino cada 22 segundos',
  'Dust Snatch': 'Zarpazo de Polvo',
  'DUST SNATCH!': '¡ZARPAZO DE POLVO!',
  'A gust off the flats takes a round out of the gun':
    'Una ráfaga de los llanos saca una bala del arma',
  'Sand in the Eyes': 'Arena en los Ojos',
  'BLINDED!': '¡CEGADO!',
  'Their next shot goes wide': 'Su próximo disparo se desvía',
  'Their next two shots go wide': 'Sus dos próximos disparos se desvían',
  Dynamite: 'Dinamita',
  'DYNAMITE!': '¡DINAMITA!',
  'Three lives at once — but a raised shield stops it dead':
    'Tres vidas de golpe, pero un escudo levantado lo para en seco',
  Lasso: 'Lazo',
  'ROPED!': '¡ENLAZADO!',
  'A rope on the gun arm — they cannot shoot for two rounds':
    'Una cuerda en el brazo del arma: no pueden disparar durante dos rondas',
  'Hornet Tree': 'Árbol de Avispas',
  'HORNET TREE!': '¡ÁRBOL DE AVISPAS!',
  'Wakes a hornet tree for the rest of the duel. The swarm comes out every 20 seconds':
    'Despierta un árbol de avispas para el resto del duelo. El enjambre sale cada 20 segundos',
  'Hornet Swarm': 'Enjambre de Avispas',
  'SWARMED!': '¡ENJAMBRADO!',
  'Swamp Fever': 'Fiebre del Pantano',
  'FEVERED!': '¡CON FIEBRE!',
  'One life a round for three rounds. No shield stops it':
    'Una vida por ronda durante tres rondas. Ningún escudo lo para',
  'Mire Grasp': 'Garra del Fango',
  'DRAGGED UNDER!': '¡ARRASTRADO AL FONDO!',
  'Two lives from underneath. A shield is no use over it':
    'Dos vidas desde abajo. Un escudo por encima no sirve de nada',
  Blackdamp: 'Aire Negro',
  'BLACKDAMP!': '¡AIRE NEGRO!',
  'Opens a gas vent for the rest of the duel. The bog breathes out every 20 seconds':
    'Abre una fumarola para el resto del duelo. La ciénaga exhala cada 20 segundos',
  'The Gallows': 'El Patíbulo',
  'THE GALLOWS!': '¡EL PATÍBULO!',
  'Raises the gallows behind the road. The bell tolls every 20 seconds, faster each beat':
    'Levanta el patíbulo detrás del camino. La campana dobla cada 20 segundos, más rápido cada vez',
  "Grave's Grip": 'Garra de la Tumba',
  'HELD!': '¡SUJETO!',
  'A hand out of the ground on the gun arm — they cannot shoot for three rounds':
    'Una mano sale de la tierra y le agarra el brazo del arma: no pueden disparar durante tres rondas',
  'Marrow Drain': 'Sangría de Médula',
  'DRAINED!': '¡DRENADO!',
  'Takes a life off them and gives it to you': 'Les quita una vida y te la da a ti',
  'Takes a life out of them and puts it in you': 'Les saca una vida y te la mete a ti',
  'Death Mark': 'Marca de Muerte',
  'MARKED!': '¡MARCADO!',
  'For three rounds, every shot that hits them costs one extra life':
    'Durante tres rondas, cada disparo que les alcance cuesta una vida más',
  'For four rounds, every shot that hits them costs one extra life':
    'Durante cuatro rondas, cada disparo que les alcance cuesta una vida más',
  "Will-o'-Wisp": 'Fuego Fatuo',
  'TERRIFIED!': '¡ATERRADO!',
  'Their shield stops nothing for two rounds': 'Su escudo no para nada durante dos rondas',
  'Their shield stops nothing for three rounds': 'Su escudo no para nada durante tres rondas',
  'Hanging Cornice': 'Cornisa Colgante',
  'CORNICE!': '¡CORNISA!',
  'Cuts a cornice loose above the pass. It breaks every 22 seconds':
    'Suelta una cornisa sobre el puerto. Se desprende cada 22 segundos',
  Whiteout: 'Ventisca Ciega',
  'WHITEOUT!': '¡VENTISCA CIEGA!',
  'Deep Freeze': 'Congelación Profunda',
  'FROZEN!': '¡CONGELADO!',
  'They are frozen solid: two rounds in which they do nothing at all':
    'Se quedan congelados del todo: dos rondas en las que no hacen absolutamente nada',
  'Two rounds in which they can do nothing at all':
    'Dos rondas en las que no pueden hacer absolutamente nada',
  'Cold Grip': 'Garra de Hielo',
  'FROZEN SHUT!': '¡SELLADO POR EL HIELO!',
  'Their cylinder freezes solid — every round in it is gone':
    'Su tambor se congela entero: todas las balas que tuviera desaparecen',
  'Cold Sweat': 'Sudor Frío',
  Volcano: 'Volcán',
  'VOLCANO!': '¡VOLCÁN!',
  'Raises a volcano behind the road. It erupts every 20 seconds for the rest of the duel':
    'Levanta un volcán detrás del camino. Entra en erupción cada 20 segundos durante el resto del duelo',
  'Magma Spout': 'Chorro de Magma',
  'MAGMA SPOUT!': '¡CHORRO DE MAGMA!',
  'Cinder Snatch': 'Zarpazo de Ceniza',
  'CINDER SNATCH!': '¡ZARPAZO DE CENIZA!',
  'Empties their gun and three of the rounds end up in yours':
    'Les vacía el arma y tres de las balas acaban en la tuya',
  'Takes two rounds out of their gun and loads one into yours':
    'Saca dos balas de su arma y carga una en la tuya',
  'Hell Whisper': 'Susurro del Infierno',
  'WHISPERED TO!': '¡LE HAN SUSURRADO!',
  'Meteor Strike': 'Impacto de Meteoro',
  'METEOR!': '¡METEORO!',
  'Four lives out of the sky. A shield is no use under it':
    'Cuatro vidas caídas del cielo. Un escudo debajo no sirve de nada',
  'The Rift': 'La Grieta',
  'THE RIFT!': '¡LA GRIETA!',
  'Tears the sky open for the rest of the duel. Every 20 seconds it charges, then fires once for everything at once':
    'Abre el cielo en canal para el resto del duelo. Cada 20 segundos carga, y luego dispara una vez por todo a la vez',
  'RIFTED!': '¡DESGARRADO!',
  'Mind Rift': 'Grieta Mental',
  'Gravity Pull': 'Tirón Gravitatorio',
  'PULLED!': '¡ARRASTRADO!',
  'Void Mirror': 'Espejo del Vacío',
  'MIRRORED!': '¡REFLEJADO!',
  'The next shot that would hit you goes back at them instead':
    'El próximo disparo que fuera a alcanzarte les vuelve a ellos',
  'SWAPPED!': '¡INTERCAMBIADO!',
  'Trades cylinders with them, whatever is in each':
    'Intercambia los tambores con ellos, lleve lo que lleve cada uno',
  'POISONED!': '¡ENVENENADO!',
  'Your next two shots cost them an extra life each':
    'Tus dos próximos disparos les cuestan una vida más cada uno',
  // -------------------------------------------------------------------------
  // The ledger: the six categories and every line in them
  // -------------------------------------------------------------------------
  Beginnings: 'Primeros pasos',
  'The first time you do anything.': 'La primera vez que haces cualquier cosa.',
  'The Road': 'El Camino',
  'Seven worlds, and the miles between them.': 'Siete mundos, y las millas que hay entre ellos.',
  Duelling: 'Duelos',
  'What happens at ten paces.': 'Lo que pasa a diez pasos.',
  Fortune: 'Fortuna',
  'Gold, guns, and everything bought with them.':
    'Oro, armas, y todo lo que se compra con ellos.',
  Survival: 'Supervivencia',
  'Hunger, weather, and staying upright.': 'Hambre, clima, y seguir en pie.',
  'The Bag': 'La Alforja',
  'What you carry, and what you do with it.': 'Lo que llevas, y lo que haces con ello.',

  'Boots On': 'Botas puestas',
  'Start your first run.': 'Empieza tu primera partida.',
  'First Blood': 'Primera sangre',
  'Win your first duel.': 'Gana tu primer duelo.',
  'Buried Boots': 'Botas enterradas',
  'Lose a duel. It happens to everybody once.':
    'Pierde un duelo. A todo el mundo le pasa una vez.',
  'Window Shopping': 'Mirando escaparates',
  'Walk into a shop.': 'Entra en una tienda.',
  'Paying Customer': 'Cliente que paga',
  'Buy something over a counter.': 'Compra algo en un mostrador.',
  'Something Pressed': 'Algo planchado',
  'Find the clothing shop.': 'Encuentra la tienda de ropa.',
  'A Roof For The Night': 'Un techo por una noche',
  'Take a bed at an inn.': 'Coge una cama en una posada.',
  Sparks: 'Chispas',
  'Step inside a forge.': 'Entra en una fragua.',
  Tempered: 'Templado',
  'Pay a smith to work on your revolver.': 'Paga a un herrero para que trabaje tu revólver.',
  'Growing Up': 'Creciendo',
  'Reach level 2.': 'Llega al nivel 2.',
  'Boss Of Nothing': 'Jefe de nada',
  'Put down your first world boss.': 'Tumba a tu primer jefe de mundo.',
  'Known By Name': 'Conocido por su nombre',
  'Give the gunslinger a name of your own.': 'Ponle al pistolero un nombre tuyo.',
  'Dressed For It': 'Vestido para la ocasión',
  'Wear something you earned.': 'Ponte algo que te hayas ganado.',

  'Set foot on the road where every story starts.':
    'Pon un pie en el camino donde empieza toda historia.',
  'Ride into world 2.': 'Entra cabalgando en el mundo 2.',
  'Ride into world 3.': 'Entra cabalgando en el mundo 3.',
  'Ride into world 4.': 'Entra cabalgando en el mundo 4.',
  'Ride into world 5.': 'Entra cabalgando en el mundo 5.',
  'Ride into world 6, where they stopped filling the holes in.':
    'Entra cabalgando en el mundo 6, donde dejaron de tapar los agujeros.',
  'Past The Last Horizon': 'Más allá del último horizonte',
  'PAST THE LAST HORIZON': 'MÁS ALLÁ DEL ÚLTIMO HORIZONTE',
  'Reach the Galaxy.': 'Llega a la Galaxia.',
  'The Stranger Falls': 'Cae el Forastero',
  'Complete every world and finish the game.': 'Completa todos los mundos y termina el juego.',
  'Nothing On Your Side': 'Nada de tu parte',
  'Set out on the hard road.': 'Sal al camino difícil.',
  'The Long Way Round': 'El camino largo',
  'Reach the Galaxy on the hard road.': 'Llega a la Galaxia por el camino difícil.',
  'Ember Reaver': 'Saqueador de Brasas',
  'Finish the game on the hard road.': 'Termina el juego por el camino difícil.',
  'Six Feet Under': 'Dos metros bajo tierra',
  'Defeat the boss of all seven worlds — across as many runs as it takes.':
    'Derrota al jefe de los siete mundos, en tantas partidas como haga falta.',
  'Stretching The Legs': 'Estirando las piernas',
  'Cover 50 miles of road.': 'Recorre 50 millas de camino.',
  'Long Walk': 'Larga caminata',
  'Cover 250 miles of road.': 'Recorre 250 millas de camino.',
  'Saddle Sore': 'Con agujetas de montar',
  'Cover 1,000 miles of road.': 'Recorre 1.000 millas de camino.',
  'Night Rider': 'Jinete nocturno',
  'Still be walking when the sun goes down.': 'Sigue caminando cuando se ponga el sol.',
  'Weather Eye': 'Ojo al cielo',
  'Travel through rain, snow and a sandstorm.':
    'Viaja bajo la lluvia, la nieve y una tormenta de arena.',
  'Three Stories': 'Tres historias',
  'Start a run in each of the three save slots.':
    'Empieza una partida en cada una de las tres ranuras.',
  'Ten Notches': 'Diez muescas',
  'Win 10 duels.': 'Gana 10 duelos.',
  'Hand Of The Road': 'Mano del camino',
  'Win 25 duels.': 'Gana 25 duelos.',
  'Fifty Men Down': 'Cincuenta hombres caídos',
  'Win 50 duels.': 'Gana 50 duelos.',
  'Legend Of The Road': 'Leyenda del camino',
  'Win 100 duels.': 'Gana 100 duelos.',
  'Bossed Around': 'Mandado por jefes',
  'Beat 3 world bosses.': 'Vence a 3 jefes de mundo.',
  Undertaker: 'Enterrador',
  'Beat 10 world bosses.': 'Vence a 10 jefes de mundo.',
  Quickdraw: 'Desenfunde rápido',
  'Win a duel in four rounds or fewer.': 'Gana un duelo en cuatro rondas o menos.',
  'War Of Attrition': 'Guerra de desgaste',
  'Win a duel that ran fifteen rounds or longer.':
    'Gana un duelo que haya durado quince rondas o más.',
  'Not A Scratch': 'Sin un rasguño',
  'Win a duel without losing a single life.': 'Gana un duelo sin perder ni una sola vida.',
  Untouched: 'Intacto',
  'Beat a world boss without losing a single life.':
    'Vence a un jefe de mundo sin perder ni una sola vida.',
  Sharpshooter: 'Tirador certero',
  'Win a duel with every shot you fired landing.':
    'Gana un duelo acertando todos los disparos que hagas.',
  'Last Stand': 'Última resistencia',
  'Win a duel on your last half a life.': 'Gana un duelo con media vida en la barra.',
  'Trick Shooter': 'Tirador de trucos',
  'Cast an ability in a duel.': 'Lanza una habilidad en un duelo.',
  'Both Barrels': 'Los dos cañones',
  'Win a duel in which you cast two abilities.':
    'Gana un duelo en el que lances dos habilidades.',
  'Card Up The Sleeve': 'Un as en la manga',
  'Go into a fight with an ability in both hands.':
    'Entra en una pelea con una habilidad en cada mano.',
  'Working Wage': 'Jornal',
  'Earn 2,500 gold in total.': 'Gana 2.500 de oro en total.',
  'Gold Rush': 'Fiebre del oro',
  'Earn 10,000 gold in total.': 'Gana 10.000 de oro en total.',
  'Heavy Pockets': 'Bolsillos cargados',
  'Hold 500 gold at once.': 'Ten 500 de oro a la vez.',
  'Full Purse': 'Bolsa llena',
  'Hold 1,200 gold at once.': 'Ten 1.200 de oro a la vez.',
  Regular: 'Cliente habitual',
  'Buy 25 things from shops.': 'Compra 25 cosas en tiendas.',
  Trader: 'Comerciante',
  'Sell something back out of your bag.': 'Vende algo sacándolo de tu alforja.',
  'Off The Rail': 'De la percha',
  'Buy something to wear.': 'Compra algo para ponerte.',
  'Hoof It': 'A caballo',
  'Buy yourself a horse.': 'Cómprate un caballo.',
  Seasoned: 'Curtido',
  'Reach level 5.': 'Llega al nivel 5.',
  Hardened: 'Endurecido',
  'Reach level 8.': 'Llega al nivel 8.',
  'Iron Constitution': 'Constitución de hierro',
  'Walk the road with a bar of 8 lives or more.':
    'Recorre el camino con una barra de 8 vidas o más.',
  'Ivory Hand': 'Mano de marfil',
  'Get your revolver to the third rung of the ladder.':
    'Lleva tu revólver al tercer peldaño de la escalera.',
  'The Nova': 'La Nova',
  'Take a revolver all the way to the top of the ladder.':
    'Lleva un revólver hasta lo más alto de la escalera.',
  'Empty Belly': 'Estómago vacío',
  'Walk your hunger all the way down to nothing.':
    'Camina hasta dejar el hambre a cero del todo.',
  'Running On Fumes': 'Tirando de reservas',
  'Have starvation take a life, and eat your way back out of it.':
    'Deja que el hambre te quite una vida, y come hasta salir de ahí.',
  'Never Hungry': 'Nunca con hambre',
  'Eat 25 times on the road.': 'Come 25 veces en el camino.',
  'Sit down to a meal that stays with you for the next few fights.':
    'Siéntate a una comida que te acompañe en las siguientes peleas.',
  'Well Rested': 'Bien descansado',
  'Sleep at an inn 10 times.': 'Duerme 10 veces en una posada.',
  'Patched Up': 'Remendado',
  'Put a bandage on in the middle of a fight.':
    'Ponte una venda en mitad de una pelea.',
  'Dusk Falls': 'Cae el ocaso',
  'Have a Dusk Totem break instead of you.':
    'Haz que un Tótem del Ocaso se rompa en tu lugar.',
  'Well Stocked': 'Bien surtido',
  'Carry six different things at once.': 'Lleva seis cosas distintas a la vez.',
  'One Of A Kind': 'Único en su especie',
  'Get a legendary item into your bag.': 'Mete un objeto legendario en tu alforja.',
  'Kitted Out': 'Bien equipado',
  'Own the vest, the canteen and the diadem at the same time.':
    'Ten el chaleco, la cantimplora y la diadema al mismo tiempo.',
  Cartographer: 'Cartógrafo',
  'Open the trail map and read the road ahead.':
    'Abre el mapa del camino y lee lo que viene.',

  // -------------------------------------------------------------------------
  // What the game says back when something cannot be done
  // -------------------------------------------------------------------------
  'Already at full lives.': 'Ya tienes todas las vidas.',
  'Already in hand.': 'Ya lo llevas en la mano.',
  'Already in use.': 'Ya está en uso.',
  'Already spent this duel.': 'Ya se ha gastado en este duelo.',
  'Not hungry.': 'No tienes hambre.',
  'Not in hand.': 'No lo llevas en la mano.',
  'Nothing happens.': 'No pasa nada.',
  'Nothing happens': 'No pasa nada',
  'Only usable in a duel.': 'Solo se puede usar en un duelo.',
  'Still charging.': 'Todavía se está cargando.',
  'That is not an ability.': 'Eso no es una habilidad.',
  'The fight is over.': 'La pelea ha terminado.',
  'Works on its own.': 'Funciona solo.',
  'You do not have that.': 'No tienes eso.',
  'Sold over the counter at a clothing shop, if the road puts one in front of you.':
    'Se vende en el mostrador de una tienda de ropa, si el camino te pone una delante.',
  // -------------------------------------------------------------------------
  // The wardrobe: five slots and everything that goes in them
  // -------------------------------------------------------------------------
  Hat: 'Sombrero',
  Shirt: 'Camisa',
  Trousers: 'Pantalones',
  Boots: 'Botas',
  Harness: 'Arreos',
  'A complete outfit': 'Un atuendo completo',
  'Complete outfit': 'Atuendo completo',
  'Clothing shop': 'Tienda de ropa',

  'Trail Hat': 'Sombrero del Camino',
  'Sun-bleached felt with a working brim. It came with the road.':
    'Fieltro descolorido por el sol con un ala que sirve. Vino con el camino.',
  'Prairie Sombrero': 'Sombrero de la Pradera',
  'A brim wider than the man. The eyes stay in its shade all day.':
    'Un ala más ancha que el hombre. Los ojos se quedan a su sombra todo el día.',
  'Road Agent': 'Salteador',
  'The same hat, and a kerchief up over the mouth. Nobody sees you draw.':
    'El mismo sombrero, y un pañuelo subido hasta la boca. Nadie te ve desenfundar.',
  'Derby Bowler': 'Bombín',
  'Town hat. Out here it is a joke, and it knows it.':
    'Sombrero de ciudad. Aquí fuera es un chiste, y lo sabe.',
  "Sheriff's Stetson": 'Stetson del Sheriff',
  'Pale felt, tall crown, a brass band. Somebody has to keep order.':
    'Fieltro claro, copa alta, cinta de latón. Alguien tiene que mantener el orden.',
  "Gambler's Stovepipe": 'Chistera del Tahúr',
  'Silk, and a brim that has never been rained on.':
    'Seda, y un ala sobre la que nunca ha llovido.',
  'Crepe Topper': 'Chistera de Crespón',
  'Black silk under black crepe. Somebody has to be dignified about it.':
    'Seda negra bajo crespón negro. Alguien tiene que llevarlo con dignidad.',
  'Company Cap': 'Gorra de la Compañía',
  'Peaked, badged, and worn by men who own the track under you.':
    'Con visera, con chapa, y la llevan los hombres dueños de la vía que pisas.',
  'Whitecrown Ushanka': 'Ushanka de Corona Blanca',
  'Pass fur, flaps down. Up there the wind is the thing that kills you.':
    'Piel del puerto, con las orejeras bajadas. Allí arriba lo que mata es el viento.',
  'Basin Helm': 'Yelmo de la Cuenca',
  'Iron off the Brimstone floor, with the horns still on it.':
    'Hierro sacado del suelo de la Cuenca de Azufre, con los cuernos todavía puestos.',
  "Reaver's Hood": 'Capucha del Saqueador',
  'A peak of black cloth, ragged at the jaw, and a slit of fire where the eyes go.':
    'Un pico de tela negra, deshilachado a la altura de la mandíbula, y una rendija de fuego donde van los ojos.',
  Starcrown: 'Corona Estelar',
  'A circlet of void iron, and a ring of light that does not touch it.':
    'Un aro de hierro del vacío, y un anillo de luz que no llega a rozarlo.',
  'Hollow Shroud': 'Sudario Hueco',

  'Red Serape': 'Sarape Rojo',
  'Wool, one cream stripe, and every mile of the first world in it.':
    'Lana, una raya crema, y todas las millas del primer mundo metidas dentro.',
  'Oilskin Duster': 'Guardapolvo Encerado',
  'Worn open, and long enough that the tails swing on the stride.':
    'Se lleva abierto, y es tan largo que los faldones se mueven al andar.',
  "Cardsharp's Brocade": 'Brocado del Fullero',
  'Gold thread on plum, over sleeves nobody paid for.':
    'Hilo de oro sobre ciruela, encima de unas mangas que no pagó nadie.',
  'Town Waistcoat': 'Chaleco de Ciudad',
  'Boiled shirt, black waistcoat, and a watch you never check.':
    'Camisa almidonada, chaleco negro, y un reloj que nunca miras.',
  'Sunday Blacks': 'Negros de Domingo',
  'Buttoned to the throat. It is the only coat he owns and it fits.':
    'Abotonado hasta el cuello. Es el único abrigo que tiene y le queda bien.',
  "Undertaker's Frock": 'Levita del Enterrador',
  'Black to the throat, one seam of fire down the front, and a hem that never went out.':
    'Negro hasta el cuello, una costura de fuego por delante, y un bajo que nunca se apagó.',
  'Boneyard Shirt': 'Camisa del Osario',
  'Linen off somebody who was not using it. It smells of turned earth and it always will.':
    'Lino sacado de alguien que ya no lo usaba. Huele a tierra removida y siempre olerá así.',
  'Company Coat': 'Abrigo de la Compañía',
  'Two rows of brass down the front of the bluest blue in the territory.':
    'Dos hileras de latón por delante del azul más azul del territorio.',
  'Mule-Train Poncho': 'Poncho de Recua',
  'Banded wool, pulled over the head. It has smelled of mules for years.':
    'Lana a rayas, se mete por la cabeza. Lleva años oliendo a mulas.',
  'Buffalo Hide': 'Piel de Búfalo',
  'Hair left on the outside. Heavy, warm, and nothing gets through it.':
    'Con el pelo por fuera. Pesada, caliente, y no la atraviesa nada.',
  'Pass Parka': 'Parka del Puerto',
  'Quilted, with fur at the throat and again at the hem.':
    'Acolchada, con piel en el cuello y otra vez en el bajo.',
  'Cinder Coat': 'Abrigo de Ceniza',
  'Char that never finished burning. The seams are still lit.':
    'Carbón que nunca terminó de arder. Las costuras siguen encendidas.',
  "Reaver's Coat": 'Abrigo del Saqueador',
  'Horizon Cloth': 'Paño del Horizonte',
  'Cloth with a sky in it. The stars move when you do.':
    'Tela con un cielo dentro. Las estrellas se mueven cuando te mueves tú.',
  'Cavalry Campaign': 'Uniforme de Campaña',
  'Crossed sabres in brass, off a regiment that is not coming back.':
    'Sables cruzados en latón, de un regimiento que no va a volver.',
  "Trader's Wrap": 'Manta del Comerciante',
  "Drover's Rig": 'Equipo de Arriero',
  'Rail Baron': 'Barón del Ferrocarril',
  "Packer's Rig": 'Equipo de Carguero',
  "Surveyor's Canvas": 'Lona del Agrimensor',

  'Trail Trousers': 'Pantalones del Camino',
  'Working canvas. Nothing to say about them, which is the idea.':
    'Lona de trabajo. No hay nada que decir de ellos, que es justo la idea.',
  'Fringed Chaps': 'Zahones con Flecos',
  'Leather over the jeans, cut long, fringed down the outside.':
    'Cuero sobre los vaqueros, cortado largo, con flecos por fuera.',
  'Rivet Denim': 'Vaqueros Remachados',
  'Indigo, and a copper rivet at every seam that ever gave out.':
    'Añil, y un remache de cobre en cada costura que alguna vez cedió.',
  'Banker\'s Stripes': 'Rayas de Banquero',
  'Pressed, and one satin line down the outside of each leg.':
    'Planchados, con una línea de raso por fuera de cada pierna.',
  'Pass Quilting': 'Guata del Puerto',
  'Scorched Leggings': 'Perneras Chamuscadas',
  'Black leather, a red seam up the thigh, and coals banked at the shin.':
    'Cuero negro, una costura roja por el muslo, y brasas apiladas en la espinilla.',
  'Riveted Greaves': 'Grebas Remachadas',
  "Reaver's Greaves": 'Grebas del Saqueador',
  'Plate over the thighs. Heavy, and it looks it.':
    'Placa sobre los muslos. Pesada, y se le nota.',
  'Starfall Trousers': 'Pantalones de Lluvia de Estrellas',
  'Cut past the last horizon, with the sky still caught in the weave.':
    'Cortados más allá del último horizonte, con el cielo aún atrapado en la trama.',
  'A gold seam up each leg, for a man who is carrying it.':
    'Una costura de oro por cada pierna, para un hombre que puede permitírselo.',
  'Bayou Waders': 'Botas Altas de Ciénaga',
  'Up past the knee, because down there everything is.':
    'Por encima de la rodilla, porque ahí abajo todo lo está.',

  'Trail Boots': 'Botas del Camino',
  'The pair you walked in on. They have held up.':
    'El par con el que llegaste andando. Han aguantado.',
  'Muleskinner Boots': 'Botas de Mulero',
  'Laced to the knee and re-soled twice. They will see you out.':
    'Atadas hasta la rodilla y con dos suelas nuevas. Te enterrarán a ti.',
  'Rowel Spurs': 'Espuelas de Rodaja',
  'Riding boots, and a wheel of brass behind each heel.':
    'Botas de montar, y una rueda de latón detrás de cada talón.',
  'Patent Blacks': 'Charoles Negros',
  'Polished until the road shows up in them.':
    'Lustradas hasta que se ve el camino reflejado en ellas.',
  'Hobnail Boots': 'Botas Claveteadas',
  'Iron in the sole. You can hear the man coming before the horse.':
    'Hierro en la suela. Oyes venir al hombre antes que al caballo.',
  'Steel-Toed Boots': 'Botas con Puntera de Acero',
  'Made for standing on sleepers while something heavy goes past.':
    'Hechas para estar de pie sobre traviesas mientras pasa algo pesado.',
  'Pass Boots': 'Botas del Puerto',
  'Tall, with the fleece turned down over the top of them.':
    'Altas, con el vellón doblado por encima.',
  'Emberwelt Boots': 'Botas de Vira Ardiente',
  'The melt never stopped running out of the welt.':
    'La colada nunca dejó de salir de la vira.',
  "Reaver's Boots": 'Botas del Saqueador',
  'Past the calf in black, and the welt has not stopped glowing since.':
    'Negras por encima de la pantorrilla, y la vira no ha dejado de brillar desde entonces.',
  'Starfall Boots': 'Botas de Lluvia de Estrellas',
  'They leave a little light wherever they land.':
    'Dejan algo de luz allá donde pisan.',
  'Gilt Boots': 'Botas Doradas',
  'Gold from the toe to the top. Loud, and meant to be.':
    'Oro de la puntera a la caña. Llamativas, y a propósito.',

  'Trail Tack': 'Arreos del Camino',
  'Plain leather and a brass bit. It came with the animal.':
    'Cuero sencillo y un bocado de latón. Vino con el animal.',
  'No Tack': 'Sin Arreos',
  'Nothing but the saddle. Some horses are better left alone.':
    'Nada más que la silla. A algunos caballos es mejor dejarlos en paz.',
  'Silverwork Tack': 'Arreos de Plata',
  'Border saddlery. Conchos from the browband to the girth.':
    'Guarnicionería de frontera. Conchos desde la frontalera hasta la cincha.',
  'Brass Show Rig': 'Atalaje de Latón',
  'Oiled black leather under more brass than any horse needs.':
    'Cuero negro engrasado bajo más latón del que necesita ningún caballo.',
  'Parade Rig': 'Atalaje de Desfile',
  'Scarlet webbing and a feather that stands straight up.':
    'Cinchas escarlata y una pluma que se queda tiesa.',
  'Pass Barding': 'Barda del Puerto',
  'Basin Barding': 'Barda de la Cuenca',
  'Basin char with the cracks still glowing through them.':
    'Carbón de la cuenca con las grietas todavía encendidas.',
  "Reaver's Barding": 'Barda del Saqueador',
  'Every strap it can carry, in black, with red iron on the shoulder and a plume to match the hem.':
    'Todas las correas que puede llevar, en negro, con hierro rojo en la espalda y un penacho a juego con el bajo.',
  'Starfall Tack': 'Arreos de Lluvia de Estrellas',
  'The fittings are not reflecting anything. There is nothing to reflect.':
    'Los herrajes no están reflejando nada. No hay nada que reflejar.',
  'Bags for the long stretches, and a roll behind the cantle.':
    'Alforjas para los tramos largos, y un petate detrás del borrén.',
  'Everything you own, and the horse is the one carrying it.':
    'Todo lo que tienes, y el que lo lleva es el caballo.',
  'Undertaker\'s Sunday': 'Domingo del Enterrador',
  'Crepe, black frock, pressed blacks and patent boots. Somebody has to be dignified about all this.':
    'Crespón, levita negra, pantalones planchados y botas de charol. Alguien tiene que llevar todo esto con dignidad.',
  "Gambler's Black": 'Negro del Tahúr',
  'Six of them are in the ground. This is what the seventh wears.':
    'Seis de ellos están bajo tierra. Esto es lo que lleva el séptimo.',
  'Company canvas, striped the same yellow as the engines.':
    'Lona de la compañía, rayada del mismo amarillo que las locomotoras.',
  'Cloth over the crown, and the tail of it left long down one side.':
    'Tela sobre la copa, con el faldón largo cayendo por un lado.',
  'A clean shirt and a star over the heart. It means what it says.':
    'Una camisa limpia y una estrella sobre el corazón. Significa lo que dice.',
  'A plate over the shoulder, off the same floor the helm came from.':
    'Una placa al hombro, del mismo suelo del que salió el yelmo.',
  'Lined with pelt and turned out at the sides. Warm, and it shows.':
    'Forrado de piel y vuelto por los lados. Caliente, y se le nota.',
  'Company blue from the cap to the toecaps. The men who own the track dress like they own it.':
    'Azul de la compañía desde la gorra hasta las punteras. Los dueños de la vía visten como dueños de la vía.',
  // -------------------------------------------------------------------------
  // The riders
  //
  // Descriptive names are translated, because that is what they are — a
  // Bare-Head Brawler is a description of the man standing across from you, not
  // a name he was given. The ones that ARE names keep them, in the shape
  // Spanish gives them: Colonel Sable becomes Coronel Sable, Big Jed becomes
  // Jed el Grande, and Old Scratch becomes what the Devil is called here.
  // -------------------------------------------------------------------------
  'Trail Drifter': 'Vagabundo del Camino',
  'Dust Drifter': 'Vagabundo del Polvo',
  'Sun-Bleached Drifter': 'Vagabundo Descolorido',
  'Broad-Hat Bandit': 'Bandido del Sombrero Ancho',
  'Bandana Bandit': 'Bandido del Pañuelo',
  'Sombrero Outlaw': 'Forajido del Sombrero',
  'Straw Hat Rustler': 'Cuatrero del Sombrero de Paja',
  'Straw Hat Thief': 'Ladrón del Sombrero de Paja',
  'Wide-Brim Rustler': 'Cuatrero del Ala Ancha',
  'Red-Mask Cattle Thief': 'Ladrón de Ganado Enmascarado',
  'Kerchief Rider': 'Jinete del Pañuelo',
  'Linen Rider': 'Jinete de Lino',
  'Crow-Chaser': 'Espantacuervos',
  'Field Scarecrow': 'Espantapájaros del Campo',
  'Stitched Scarecrow': 'Espantapájaros Cosido',
  'Bare-Head Brawler': 'Peleón sin Sombrero',
  'Broken-Nose Brawler': 'Peleón de Nariz Rota',
  'Bar Brawler': 'Peleón de Cantina',
  'Table Cheat': 'Tramposo de Mesa',
  'Bowler-Hat Card Sharp': 'Fullero del Bombín',
  'Riverboat Gambler': 'Tahúr de Barco Fluvial',
  'Star-Badge Lawman': 'Alguacil de la Estrella',
  'Black-Coat Preacher': 'Predicador del Abrigo Negro',
  'Stovepipe Sermoner': 'Sermoneador de la Chistera',
  'Swamp Preacher': 'Predicador del Pantano',
  'Marsh Shade': 'Sombra de la Marisma',
  'Reed Wraith': 'Espectro de los Juncos',
  'Nameless Shade': 'Sombra sin Nombre',
  'The Thing in the Reeds': 'La Cosa entre los Juncos',
  'Hollow Walker': 'Caminante Hueco',
  'Bare-Skull Drifter': 'Vagabundo de Cráneo Desnudo',
  'Dry Bones Gunhand': 'Pistolero de Huesos Secos',
  'Rattlebone Gunhand': 'Pistolero de Huesos Traqueteantes',
  'Rattlebone Kid': 'El Chaval de los Huesos',
  'Smouldering Gunhand': 'Pistolero Humeante',
  'Bone Marshal': 'Mariscal de Hueso',
  'Hat-and-Skull': 'Sombrero y Calavera',
  'Rope-and-Bag': 'Cuerda y Saco',
  'Hole-Digger': 'Cavador de Fosas',
  Pallbearer: 'Portador del Féretro',
  Revenant: 'Aparecido',
  'The Sexton': 'El Sacristán',
  'The Gravedigger': 'El Sepulturero',
  'The Hangman': 'El Verdugo',
  'The Long Drop': 'La Caída Larga',
  'The Quiet One': 'El Callado',
  'The Unnamed': 'El Innombrado',
  'The One That Came Back': 'El Que Volvió',
  'The Wound Man': 'El Hombre de las Heridas',
  'The Riveted Man': 'El Hombre Remachado',
  'The Horned Gun': 'El Arma Cornuda',
  'Fur-Hood Trapper': 'Trampero de Capucha de Piel',
  'Goggle-Eyed Trapper': 'Trampero de las Gafas',
  'Pelt Hunter': 'Cazador de Pieles',
  'Wolfskin Rider': 'Jinete de Piel de Lobo',
  'Glare Hunter': 'Cazador del Resplandor',
  'Snow-Blind Sharpshooter': 'Tirador Cegado por la Nieve',
  'Whiteout Kate': 'Kate Ventisca',
  'Barbwire Bill': 'Bill Alambre de Púas',
  'Big Jed': 'Jed el Grande',
  'Colonel Sable': 'Coronel Sable',
  'Old Scratch': 'El Maligno',
  'Ash Widow': 'Viuda de Ceniza',
  'Veiled Widow': 'Viuda con Velo',
  'Widow in Crape': 'Viuda de Crespón',
  'Ember Rider': 'Jinete de Brasas',
  'Cinder Rider': 'Jinete de Ceniza',
  'Brimstone Devil': 'Demonio de Azufre',
  'Horned Fiend': 'Engendro Cornudo',
  'Furnace-Masked Smelter': 'Fundidor de la Máscara de Horno',
  'Iron Kiln': 'Horno de Hierro',
  'Helmed Reaver': 'Saqueador con Yelmo',
  'Star Reaver': 'Saqueador Estelar',
  'Visored Void Rider': 'Jinete del Vacío con Visera',
  'Void Sheriff': 'Sheriff del Vacío',
  'Cosmic Marshal': 'Mariscal Cósmico',
  'Spade Hand': 'Mano de Pala',
  'The Stranger': 'El Forastero',
  'The Stranger · Unmasked': 'El Forastero · Sin Máscara',
  // -------------------------------------------------------------------------
  // The admin panel
  //
  // It is a developer's tool hidden behind a passphrase, and it is still part
  // of the game, so it is translated like the rest of it. What is NOT
  // translated is the override keys it prints — `walk.speedMul`,
  // `road.forceNext` — because those are the names of real fields and a
  // translated field name is a field nobody can find.
  // -------------------------------------------------------------------------
  ADMIN: 'ADMIN',
  'Admin panel': 'Panel de administración',
  Passphrase: 'Contraseña',
  'Back to the road': 'Volver al camino',
  'Reset overrides': 'Restablecer ajustes forzados',
  'Every override is back to the game': 'Todos los ajustes forzados vuelven al juego',
  'reset from the panel footer': 'restablecido desde el pie del panel',
  'overrides reset': 'ajustes forzados restablecidos',

  // Tabs
  Run: 'Partida',
  Road: 'Camino',
  Odds: 'Probabilidades',
  Gear: 'Equipo',
  Enemy: 'Enemigo',
  Battle: 'Combate',
  Looks: 'Aspecto',
  Lab: 'Laboratorio',

  // Run tab
  Slot: 'Ranura',
  Difficulty: 'Dificultad',
  'A slot chooses this once and the game never offers it again. Here it is a dial — write the save below to make it stick.':
    'Una ranura elige esto una vez y el juego no vuelve a ofrecerlo. Aquí es un mando: escribe la partida abajo para que quede fijado.',
  'Purse and level': 'Bolsa y nivel',
  Gold: 'Oro',
  Level: 'Nivel',
  Exp: 'Exp',
  'Level up': 'Subir de nivel',
  'Rebuilds the bar from the level, the way a save does':
    'Reconstruye la barra a partir del nivel, igual que hace una partida guardada',
  Lives: 'Vidas',
  Maximum: 'Máximo',
  'Gold lives': 'Vidas de oro',
  'Spent before the red ones, never healed': 'Se gastan antes que las rojas, no se curan nunca',
  'Half diamonds are legal — the grid draws them':
    'Los medios diamantes son legales: la cuadrícula los dibuja',
  'Full heal': 'Curación completa',
  'Down to half a life': 'Bajar a media vida',
  Invulnerable: 'Invulnerable',
  'The road cannot take a life — starvation included. A duel still can':
    'El camino no puede quitarte una vida, ni siquiera el hambre. Un duelo sí',
  'Damage override': 'Daño forzado',
  'Replaces the ladder outright. Empty the box to hand it back':
    'Sustituye la escalera por completo. Vacía la casilla para devolverla',
  'The gun': 'El arma',
  Rung: 'Peldaño',
  Rations: 'Provisiones',
  Fill: 'Llenar',
  Drain: 'Vaciar',
  'Starts the starvation clock on the next step':
    'Pone en marcha el reloj del hambre en el siguiente paso',
  'Freeze the gauge': 'Congelar el medidor',
  'Stops the drain and the starvation clock with it':
    'Detiene la bajada y con ella el reloj del hambre',
  'Multiplier on top of the horse, the canteen and the sky':
    'Multiplicador por encima del caballo, la cantimplora y el cielo',
  'On a horse': 'A caballo',
  Carried: 'Llevado encima',
  'Give a canteen': 'Dar una cantimplora',
  'Give a map': 'Dar un mapa',
  'Give a totem': 'Dar un tótem',
  'Give a vest': 'Dar un chaleco',
  'Distance walked': 'Distancia recorrida',
  Duels: 'Duelos',
  'Everything else…': 'Todo lo demás…',
  'Everything is free': 'Todo es gratis',
  'Counters, beds and the forge stop charging. The number above stops moving':
    'Los mostradores, las camas y la fragua dejan de cobrar. El número de arriba deja de moverse',
  'Faster, hungrier, and the road gets shorter':
    'Más rápido, con más hambre, y el camino se acorta',
  'Kill the run': 'Matar la partida',
  'Erases the slot, exactly like dying does': 'Borra la ranura, exactamente igual que morir',
  'The slot': 'La ranura',
  'Write the save now': 'Escribir la partida ahora',
  'The run is written after every encounter anyway. This is for when you have just changed six numbers and want them on the disk before the next thing goes wrong.':
    'La partida se escribe después de cada encuentro de todas formas. Esto es para cuando acabas de cambiar seis números y quieres que estén en el disco antes de que se tuerza lo siguiente.',
  'Live. Prices, riders and beds all follow on the next read':
    'En caliente. Los precios, los jinetes y las camas lo siguen en la próxima lectura',
  'save written from the panel': 'partida escrita desde el panel',

  // Road tab
  'What is next': 'Qué viene ahora',
  'The stop in front of you': 'La parada que tienes delante',
  'Rewrites the card you are actually walking towards':
    'Reescribe la carta hacia la que estás caminando de verdad',
  '— the road decides': '— lo decide el camino',
  'A shop': 'Una tienda',
  'An inn': 'Una posada',
  'A forge': 'Una fragua',
  'A clothier': 'Un ropero',
  'A real boss fight — it counts': 'Una pelea de jefe de verdad: cuenta',
  'Every card from here': 'Todas las cartas a partir de aquí',
  'Forced now — the biome will still roll something legal when it runs out':
    'Forzado ahora: el bioma seguirá sacando algo legal cuando se acabe',
  'Only while the world still holds one of that kind':
    'Solo mientras al mundo le quede uno de ese tipo',
  'Turn the whole road face up': 'Poner todo el camino boca arriba',
  'Nothing left on this road': 'No queda nada en este camino',
  'whole segment revealed': 'tramo entero revelado',
  'Skip this stop': 'Saltar esta parada',
  'Marks it cleared and moves the counter on': 'La marca como superada y avanza el contador',
  'jumped to the next stop': 'saltado a la parada siguiente',
  'Shove forward': 'Empujar hacia delante',
  'Pixels. The encounter still fires through the ordinary path':
    'Píxeles. El encuentro se dispara igualmente por el camino de siempre',
  'The stops stay where they are — you just get there sooner':
    'Las paradas se quedan donde están: solo llegas antes',
  'Walk to it': 'Ir andando',
  'Walk into one now': 'Entrar en uno ahora',
  'Puts you on its doorstep and closes the panel':
    'Te deja en la puerta y cierra el panel',
  'These open the real screen against the real world. Leaving a shop puts the encounter counter on, exactly as walking into one would.':
    'Estos abren la pantalla real contra el mundo real. Salir de una tienda avanza el contador de encuentros, exactamente igual que entrar en una andando.',
  'Re-deal the horizon': 'Repartir de nuevo el horizonte',
  'Same world, new road': 'Mismo mundo, camino nuevo',
  'Redraw this world': 'Volver a trazar este mundo',
  'Clear the segment': 'Despejar el tramo',
  'Skip to the next world': 'Saltar al mundo siguiente',
  'Crossing a border the way the game does it: fresh segment, full bar, saved':
    'Cruzar una frontera como lo hace el juego: tramo nuevo, barra llena, guardado',
  'Play the intro card': 'Reproducir la carta de entrada',
  'Roll the ending': 'Lanzar el final',
  'The victory screen, without finishing anything':
    'La pantalla de victoria, sin haber terminado nada',
  'End the run': 'Terminar la partida',
  'Sky and hour': 'Cielo y hora',
  'Hour of the day': 'Hora del día',
  'Stop the clock': 'Parar el reloj',
  'The sun stays exactly where you put it': 'El sol se queda exactamente donde lo pongas',
  'Hold it': 'Mantenerlo',
  'Seconds to keep the current sky for': 'Segundos que se mantiene el cielo actual',
  Pace: 'Ritmo',
  'Walking speed': 'Velocidad al andar',
  'Drops the "never two buildings in a row" floor and the gap dimmer':
    'Elimina la regla de "nunca dos edificios seguidos" y el atenuador de separación',
  'The run only ever holds one of these — this is the only way to see a second':
    'La partida solo llega a tener uno de estos: esta es la única forma de ver un segundo',
  'the map': 'el mapa',
  'next stop rewritten to {kind}': 'siguiente parada reescrita a {kind}',
  'weather forced to {id}': 'clima forzado a {id}',
  'shoved {n} px down the road': 'empujado {n} px por el camino',

  // Odds tab
  'What the road wants': 'Lo que quiere el camino',
  'What is bent right now': 'Qué está torcido ahora mismo',
  'Nothing. This run is the game as designed.':
    'Nada. Esta partida es el juego tal y como se diseñó.',
  'Put it all back': 'Devolverlo todo',
  'Back to this world\'s table': 'Volver a la tabla de este mundo',
  Fights: 'Peleas',
  Counters: 'Mostradores',
  Beds: 'Camas',
  Smithies: 'Herrerías',
  Clothiers: 'Roperos',
  'Wanted in proportion to how hurt you are': 'Se quiere en proporción a lo herido que estés',
  'Wanted when the purse could pay for the next rung':
    'Se quiere cuando la bolsa podría pagar el siguiente peldaño',
  'Wanted when there is gold, urgently when there is no food':
    'Se quiere cuando hay oro, y con urgencia cuando no hay comida',
  'Only ever in one world of the run, and only when there is gold':
    'Solo en un mundo de la partida, y solo cuando hay oro',
  'The appetite that is never dimmed by spacing':
    'El apetito que la separación nunca atenúa',
  'A thumb on the scale, applied to the appetite before the hand count and the spacing dimmer. Zero means the road will not deal that kind at all while anything else is legal.':
    'Un dedo en la balanza, aplicado al apetito antes del recuento de la mano y del atenuador de separación. Cero significa que el camino no repartirá ese tipo mientras haya cualquier otro que sea legal.',
  'Ignore spacing': 'Ignorar la separación',
  'Two buildings in a row become legal': 'Dos edificios seguidos pasan a ser legales',
  'The road map prints the exact odds these produce':
    'El mapa del camino imprime las probabilidades exactas que dan estos valores',
  'The economy': 'La economía',
  Discount: 'Descuento',
  'Discount chance': 'Probabilidad de descuento',
  'Shop prices only — a sale still pays half the item\'s base value':
    'Solo precios de tienda: una venta sigue pagando la mitad del valor base del objeto',
  'Gold from a body': 'Oro de un cadáver',
  'Exp from a body': 'Exp de un cadáver',
  'Extra slots': 'Ranuras extra',
  'Empty to hand it back to the perks the run has bought':
    'Vacío para devolvérselo a las ventajas que la partida haya comprado',
  'Everything on a shelf': 'Todo lo que hay en un estante',
  'All legendary': 'Todo legendario',
  'See what that does': 'A ver qué pasa',
  'Everything on this list is thrown away when the run is left or reloaded. None of it is ever written to a save.':
    'Todo lo de esta lista se descarta al salir de la partida o al recargarla. Nada de esto se escribe nunca en una partida guardada.',

  // Gear tab
  'The two hands': 'Las dos manos',
  Abilities: 'Habilidades',
  'Anything can go in a slot from here, bought or not — it is put in the bag on the way in, because a duel reads the bag to check the slot is honest.':
    'Desde aquí puede ir cualquier cosa en una ranura, comprada o no: se mete en la alforja al entrar, porque el duelo lee la alforja para comprobar que la ranura es honesta.',
  Bag: 'Alforja',
  'In the bag': 'En la alforja',
  'What is in there now': 'Qué hay ahí dentro ahora',
  'Empty the bag': 'Vaciar la alforja',
  'bag emptied': 'alforja vaciada',
  'The catalogue': 'El catálogo',
  'Search the catalogue': 'Buscar en el catálogo',
  'One of everything': 'Uno de cada cosa',
  'The whole catalogue, one apiece': 'El catálogo entero, uno de cada',
  'one of every item given': 'entregado uno de cada objeto',
  'A week of food': 'Comida para una semana',
  'A field hospital': 'Un hospital de campaña',
  Food: 'Comida',
  Healing: 'Curación',
  '— empty': '— vacío',

  // Enemy tab
  'Roll a rider for this world': 'Sacar un jinete para este mundo',
  'Roll it normally': 'Sacarlo normalmente',
  'Roll one and look at it': 'Sacar uno y mirarlo',
  'The roll goes through the same generator the road uses, overrides and all — so this is a preview of what you have actually configured.':
    'La tirada pasa por el mismo generador que usa el camino, con ajustes forzados incluidos: así que esto es una vista previa de lo que has configurado de verdad.',
  'Fight something made up': 'Pelear contra algo inventado',
  'World profile': 'Perfil del mundo',
  'Every archetype in the game, including the six bosses':
    'Todos los arquetipos del juego, incluidos los seis jefes',
  'Its head': 'Su cabeza',
  Kit: 'Equipo',
  'Carrying nothing': 'Sin llevar nada',
  '— rolled by the world': '— lo saca el mundo',
  '— whatever the roster rolls': '— lo que saque la lista',
  'Lives per hit': 'Vidas por impacto',
  'The thing it raises on the road behind it':
    'Lo que levanta en el camino detrás de él',
  Policy: 'Política',
  'normal — the game\'s opponent': 'normal: el rival del juego',
  'aggressive — fires the moment it can': 'agresivo: dispara en cuanto puede',
  'defensive — shields whenever allowed': 'defensivo: se cubre siempre que puede',
  'random — a flat third each way': 'aleatorio: un tercio para cada cosa',
  'oracle — always counters its read': 'oráculo: siempre contesta a su lectura',
  'dummy — reloads forever': 'muñeco: recarga sin parar',
  'Thinks for': 'Piensa durante',
  'Milliseconds before it answers. Zero makes a duel very fast':
    'Milisegundos antes de responder. Cero hace que un duelo vaya muy rápido',
  'Read cap': 'Tope de lectura',
  'The most of its turns it may ever play off a read of you':
    'La mayor parte de sus turnos que puede llegar a jugar leyéndote',
  'On top of the engine\'s 14% a round': 'Por encima del 14% por ronda del motor',
  'Feeds the read cap, and the weather still subtracts from it':
    'Alimenta el tope de lectura, y el clima sigue restándole',
  'Shield share': 'Proporción de escudo',
  'Ceiling on the share of turns it spends behind a shield':
    'Techo de la proporción de turnos que pasa detrás de un escudo',
  Script: 'Guion',
  Wears: 'Lleva puesto',
  Landmark: 'Hito',

  // Battle tab
  'The fighter': 'El luchador',
  'Fight it': 'Pelear contra él',
  'A drifter': 'Un vagabundo',
  'The Test Dummy': 'El Muñeco de Pruebas',
  'Forty lives and a harmless gun — for watching your own numbers':
    'Cuarenta vidas y un arma inofensiva: para observar tus propios números',
  'The Wall': 'El Muro',
  'A wall': 'Un muro',
  'The Kitchen Sink': 'Todo Menos el Fregadero',
  'Every trick in the game, cast constantly': 'Todos los trucos del juego, lanzados sin parar',
  'Everything at once': 'Todo a la vez',
  'Ready-made': 'Listo para usar',
  Sandbox: 'Cajón de arena',
  'This world\'s boss': 'El jefe de este mundo',
  'This world\'s kit': 'El equipo de este mundo',
  'A copy of it, without the entrance or the second phase':
    'Una copia de él, sin la entrada ni la segunda fase',
  'The boss bar, the boss music and the boss framing':
    'La barra de jefe, la música de jefe y el encuadre de jefe',
  'The six boss archetypes are in this list too':
    'Los seis arquetipos de jefe también están en esta lista',
  'Fights as a boss': 'Pelea como un jefe',
  'In your hands': 'En tus manos',
  'You walk in with': 'Entras con',
  'Your bullet': 'Tu bala',
  'Its hand': 'Su mano',
  'Reaches for a trick': 'Echa mano de un truco',
  'Reaches for it': 'Echa mano de ello',
  'Starts loaded with': 'Empieza cargado con',
  'Chambers already full when the fight opens':
    'Recámaras ya llenas cuando empieza la pelea',
  'Lives it takes per hit': 'Vidas que quita por impacto',
  '×1 is the ordinary 14% a round': '×1 es el 14% por ronda de siempre',
  Called: 'Llamado',
  Where: 'Dónde',
  'Decides the biome, the tint and the music behind the fight':
    'Decide el bioma, el tinte y la música detrás de la pelea',
  '— none': '— ninguno',
  Drifter: 'Vagabundo',

  // Looks tab
  Wearing: 'Puesto',
  'The drawers': 'Los cajones',
  'Dress at random': 'Vestir al azar',
  'Back to the trail set': 'Volver al conjunto del camino',
  'Back to what is earned': 'Volver a lo que está ganado',
  'Everything the road gives': 'Todo lo que da el camino',
  'The last garment in every drawer': 'La última prenda de cada cajón',
  'outfit handed back': 'atuendo devuelto',

  // Lab tab
  'Roll a lot of something': 'Sacar mucho de algo',
  'How many to roll. Ten thousand is still instant':
    'Cuántos sacar. Diez mil sigue siendo instantáneo',
  'Riders in this world': 'Jinetes de este mundo',
  'Riders in every world': 'Jinetes de todos los mundos',
  'Roads in this world': 'Caminos de este mundo',
  'Counters in this world': 'Mostradores de este mundo',
  'Every one of these calls the real generator with the overrides you have set, so a batch is a measurement of the game as it is configured right now.':
    'Cada uno de estos llama al generador de verdad con los ajustes forzados que hayas puesto, así que una tanda es una medición del juego tal y como está configurado ahora mismo.',
  'Nothing rolled yet.': 'Todavía no se ha sacado nada.',
  'Nothing yet.': 'Nada todavía.',
  'reading…': 'leyendo…',
  'The reading': 'La lectura',
  'Half an hour into a session this is the only reliable answer to "why is this run behaving like that".':
    'Con media hora de sesión encima, esta es la única respuesta fiable a "por qué se está comportando así esta partida".',
  'The raw state': 'El estado en bruto',
  'For looking at the stack': 'Para mirar la pila',
  'Copy what is shown': 'Copiar lo que se ve',
  'The browser would not allow it': 'El navegador no lo ha permitido',
  'The run': 'La partida',
  'Fill it with the live run': 'Llenarlo con la partida en curso',
  'Paste a serialised run here': 'Pega aquí una partida serializada',
  'Make it the run': 'Convertirlo en la partida',
  'The paste box replaces the live run with whatever JSON you give it — the same call a save file goes through on load, with none of the checks a save gets.':
    'La caja de pegado sustituye la partida en curso por el JSON que le des: la misma llamada por la que pasa un archivo de guardado al cargarse, sin ninguna de las comprobaciones que sí tiene un guardado.',
  'The run is whatever you just pasted': 'La partida es lo que acabas de pegar',
  'run replaced from a paste': 'partida sustituida desde un pegado',
  'paste a run back in': 'volver a pegar una partida',
  'The doors': 'Las puertas',
  'Break something on purpose': 'Romper algo a propósito',
  'Fire the totem scene': 'Lanzar la escena del tótem',
  'Plays the revival even with no totem in the bag':
    'Reproduce la resurrección aunque no haya tótem en la alforja',
  'Announce the weather': 'Anunciar el clima',
  'Ten toasts': 'Diez avisos',
  'Every HUD event re-fired': 'Todos los eventos del HUD relanzados',
  'Repaint the interface': 'Repintar la interfaz',
  'These emit the real events. The run will do whatever it ordinarily does when it hears them — including ending.':
    'Estos emiten los eventos de verdad. La partida hará lo que hace normalmente al oírlos, incluido terminarse.',
  'The safety net that moves you on when the road runs out':
    'La red de seguridad que te hace avanzar cuando se acaba el camino',
  'The ledger': 'El registro',
  'Unlock everything': 'Desbloquearlo todo',
  'Including every garment they pay out in': 'Incluidas todas las prendas que pagan',
  'every achievement unlocked': 'todos los logros desbloqueados',
  'Wipe it': 'Borrarlo',
  'achievement ledger wiped': 'registro de logros borrado',
  'Takes a reload — the ledger is read once at boot':
    'Hace falta recargar: el registro se lee una sola vez al arrancar',
  'This one IS permanent. The ledger lives on the device, not in the run.':
    'Este SÍ es permanente. El registro vive en el dispositivo, no en la partida.',
  'Three tries per slot, ever. A slot that has been opened stays open; a slot that has spent its three never opens again. Nothing in this panel hands out a try — that is the point of them.':
    'Tres intentos por ranura, para siempre. Una ranura que se ha abierto se queda abierta; una que ha gastado sus tres no vuelve a abrirse. Nada en este panel reparte intentos: para eso están.',
  'What this session has done': 'Lo que ha hecho esta sesión',
  'Everything on the device': 'Todo lo del dispositivo',
  'Every key the game has written, saves included':
    'Todas las claves que ha escrito el juego, guardados incluidos',
  'Wiped. Reload the page to see it': 'Borrado. Recarga la página para verlo',
  'Put every override back': 'Devolver todos los ajustes forzados',
  // -------------------------------------------------------------------------
  // The admin road map — the whole segment, face up, with the numbers behind it
  // -------------------------------------------------------------------------
  World: 'Mundo',
  Biome: 'Bioma',
  Name: 'Nombre',
  Roster: 'Lista',
  'The road': 'El camino',
  'The sky': 'El cielo',
  'The clocks': 'Los relojes',
  'The counters': 'Los mostradores',
  'The next card': 'La carta siguiente',
  'The next rider': 'El jinete siguiente',
  Encounter: 'Encuentro',
  Travelled: 'Recorrido',
  Walking: 'Andando',
  Standing: 'Parado',
  Mounted: 'A caballo',
  Hour: 'Hora',
  Intensity: 'Intensidad',
  Lasts: 'Dura',
  Visibility: 'Visibilidad',
  'Duel effect': 'Efecto en duelo',
  'Landmark erupts': 'El hito entra en erupción',
  Hunger: 'Hambre',
  Draining: 'Bajando',
  'Empty in': 'Vacío en',
  Bed: 'Cama',
  Bullet: 'Bala',
  'Heavier bullet': 'Bala más pesada',
  'Next rung': 'Peldaño siguiente',
  'Price here': 'Precio aquí',
  Pays: 'Paga',
  Slots: 'Ranuras',
  'Slot zero': 'Ranura cero',
  'Clothier world': 'Mundo con ropero',
  'Duels this world': 'Duelos en este mundo',
  'Run seed': 'Semilla de la partida',
  'Segment seed': 'Semilla del tramo',
  'Face up window': 'Ventana boca arriba',
  'On screen': 'En pantalla',
  Spacing: 'Separación',
  'Opening rule': 'Regla de apertura',
  Carrying: 'Lleva',
  'Carrying a trick': 'Lleva un truco',
  'Carrying the landmark': 'Lleva el hito',
  Tricks: 'Trucos',
  'Reads your move': 'Te lee el movimiento',
  'Still in the hand': 'Todavía en la mano',
  'Nothing is face down. Every stop on this road has been decided.':
    'No queda nada boca abajo. Todas las paradas de este camino están decididas.',
  'The whole segment, including what the player cannot see. A stop marked "face down" has no kind yet — it is decided when the horizon reaches it.':
    'El tramo entero, incluido lo que el jugador no puede ver. Una parada marcada como "boca abajo" todavía no tiene tipo: se decide cuando el horizonte llega a ella.',
  'The road picks the kind of the next face-down stop from how the run is going. This is that decision, before it is taken.':
    'El camino elige el tipo de la siguiente parada boca abajo según cómo vaya la partida. Esta es esa decisión, antes de tomarse.',
  "Rolled fresh for every duel from this world's profile. The percentages are the world's own weight tables, normalised.":
    'Se saca de nuevo en cada duelo a partir del perfil de este mundo. Los porcentajes son las tablas de pesos del propio mundo, normalizadas.',
  'always something that heals': 'siempre algo que cure',
  'beds in hand': 'camas en la mano',
  'fights in reserve': 'peleas en reserva',
  'how many of a thing lands on the shelf': 'cuántas unidades de algo acaban en el estante',
  'legal here': 'legal aquí',
  'must be a fight': 'tiene que ser una pelea',
  'since a building': 'desde el último edificio',
  'spacing dimmer': 'atenuador de separación',
  'the boss at the end of it': 'el jefe que hay al final',
  'the tier each slot rolls on': 'el nivel sobre el que tira cada ranura',
  'what those odds are read off': 'de dónde se leen esas probabilidades',
  'where it can go from here': 'a dónde puede ir desde aquí',
  'the kit this world carries': 'el equipo que lleva este mundo',
  '…and a second one': '…y un segundo',
  '…canteen': '…cantimplora',
  '…horse': '…caballo',
  '…panel': '…panel',
  '…weather': '…clima',

  'A sky that does not exist': 'Un cielo que no existe',
  'rolled from the archetype': 'sacado del arquetipo',
  '  lives': '  vidas',
  '  rarity of what was on the shelf': '  rareza de lo que había en el estante',
  '  the first stop of the world': '  la primera parada del mundo',
  '  the ten commonest things to find': '  las diez cosas más comunes de encontrar',
  '  what the stops came out as': '  en qué salieron las paradas',
  'Frayed-Brim Tramp': 'Vagabundo del Ala Deshilachada',
  // -------------------------------------------------------------------------
  // Sentences with something variable in them
  //
  // The braces move. Spanish does not put its words where English does, and
  // that is the whole reason these are written out as sentences instead of
  // being glued together at the call site.
  // -------------------------------------------------------------------------
  'Slot {slot}': 'Ranura {slot}',
  'Slot {slot} erased': 'Ranura {slot} borrada',
  'Slot {slot} written': 'Ranura {slot} escrita',
  'Erase slot {slot}': 'Borrar la ranura {slot}',
  'Everything in slot {slot} is lost for good. There is no way back.':
    'Todo lo de la ranura {slot} se pierde para siempre. No hay vuelta atrás.',
  'Slot {slot} has been erased. That run is gone for good.':
    'La ranura {slot} se ha borrado. Esa partida se ha perdido para siempre.',
  'Start a new {mode} run in slot {slot}':
    'Empezar una partida nueva en {mode} en la ranura {slot}',
  'Difficulty for slot {slot}': 'Dificultad de la ranura {slot}',

  '{gold} gold short': 'Te faltan {gold} de oro',
  '{gold} gold': '{gold} de oro',
  'Bought {name}': 'Has comprado: {name}',
  'Buy {name} for {gold} gold': 'Comprar {name} por {gold} de oro',
  'You cannot carry another {name}': 'No puedes llevar otro {name}',
  '{name} for {gold} gold': '{name} por {gold} de oro',
  '{name} — yours for good': '{name}: tuyo para siempre',
  'Sold for {gold} gold': 'Vendido por {gold} de oro',
  '{count} extra lives — they go first': '{count} vidas de más: se gastan primero',
  '{name}, {count}': '{name}, {count}',
  '+{gold} gold · +{exp} exp': '+{gold} de oro · +{exp} de exp',
  '{gun} — {lives} lives a shot': '{gun}: {lives} vidas por disparo',

  '{lives} of {max} lives': '{lives} de {max} vidas',
  '{lives} of {max} lives, plus {bonus} bonus': '{lives} de {max} vidas, más {bonus} de regalo',
  '{loaded} of {chambers} chambers loaded': '{loaded} de {chambers} recámaras cargadas',
  'Lv {n}': 'Nv {n}',

  '{label} — the next duel starts with {bullets} rounds loaded':
    '{label}: el próximo duelo empieza con {bullets} balas cargadas',
  '{label} — the next {count} duels start with {bullets} rounds loaded':
    '{label}: los próximos {count} duelos empiezan con {bullets} balas cargadas',
  'the horse': 'el caballo',
  'the {weather}': 'la {weather}',
  'the canteen': 'la cantimplora',
  ', even with the canteen': ', incluso con la cantimplora',
  ', despite {reasons}': ', a pesar de {reasons}',
  '{subject} is burning your rations faster':
    '{subject} te está gastando las provisiones más rápido',
  '{subject} are burning your rations faster':
    '{subject} te están gastando las provisiones más rápido',
  '{subject} is stretching your rations': '{subject} te está estirando las provisiones',
  '{subject} is burning your rations faster{aside}':
    '{subject} te está gastando las provisiones más rápido{aside}',
  '{subject} are burning your rations faster{aside}':
    '{subject} te están gastando las provisiones más rápido{aside}',
  '{subject} is stretching your rations{aside}':
    '{subject} te está estirando las provisiones{aside}',

  '{label} — {left} left': '{label}: quedan {left}',
  '{label} — spent for this duel': '{label}: gastado en este duelo',
  '{label} — {bullets} rounds already loaded': '{label}: {bullets} balas ya cargadas',
  'You call down the {trick}': 'Invocas {trick}',
  '{name} calls up the {trick}': '{name} invoca {trick}',
  'The {trick} is winding up': '{trick} se está preparando',
  '{mine} vs {theirs}': '{mine} contra {theirs}',
  '{name} · {rounds} rounds': '{name} · {rounds} rondas',
  '{name} · {rounds} rounds · sandbox': '{name} · {rounds} rondas · cajón de arena',
  '{cost} a shot': '{cost} por disparo',
  Ability: 'Habilidad',
  Frozen: 'Congelado',

  '{world}. Continue.': '{world}. Continuar.',
  '{name} rode past the last horizon and came back':
    '{name} cabalgó más allá del último horizonte y volvió',
  '{category} · {done}/{total}': '{category} · {done}/{total}',
  '{name}. {description} Unlocked.': '{name}. {description} Desbloqueado.',
  '{name}. {description} Locked.': '{name}. {description} Bloqueado.',
  '{what} is not wired up yet': '{what} todavía no está conectado',
  "{name}'S SALOON": 'CANTINA DE {name}',
  'Locked — {reason}': 'Bloqueado: {reason}',
  'not yours yet': 'todavía no es tuyo',
  'Trail map of {world}': 'Mapa del camino de {world}',

  // Admin readouts
  '{index} of {total}': '{index} de {total}',
  '{n} lives': '{n} vidas',
  '{pct} for {n} lives': '{pct} para {n} vidas',
  '{value} — lives ÷ max lives': '{value} — vidas ÷ vidas máximas',
  '{value} — rations ÷ full gauge': '{value} — provisiones ÷ medidor lleno',
  '{value} — gold ÷ three premium beds here': '{value} — oro ÷ tres camas buenas de aquí',
  '{n} a second (×{mul})': '{n} por segundo (×{mul})',
  '{n} px a second': '{n} px por segundo',
  '{n} px': '{n} px',
  '{n} stops': '{n} paradas',
  'half a life every {n} s': 'media vida cada {n} s',
  'every sky the {biome} has': 'todos los cielos que tiene {biome}',
  '{gold} gold · {exp} exp': '{gold} de oro · {exp} de exp',
  'worth {gold} gold · {exp} exp': 'vale {gold} de oro · {exp} de exp',
  '{cheap} for {lives} lives · {dear} for the lot':
    '{cheap} por {lives} vidas · {dear} por todo',
  '{phase}': '{phase}',
  '{phase} · night, −0.1 to their read': '{phase} · noche, −0,1 a su lectura',
  '{lives}/{max}{bonus} lives': '{lives}/{max}{bonus} vidas',
  '{lives}/{max} lives{bonus}': '{lives}/{max} vidas{bonus}',
  '{n} rungs up the ladder': '{n} peldaños por la escalera',
  '— where I am standing ({world})': '— donde estoy ahora ({world})',
  'custom fight: {name}, {lives} lives (sandbox)':
    'pelea a medida: {name}, {lives} vidas (cajón de arena)',
  'custom fight: {name}, {lives} lives (for real)':
    'pelea a medida: {name}, {lives} vidas (de verdad)',
  '{exp} for the next one': '{exp} para el siguiente',
  '{rung} · {gun} — {lives} lives': '{rung} · {gun} — {lives} vidas',
  'difficulty set to {id}': 'dificultad puesta en {id}',
  '{won} won · {lost} lost': '{won} ganados · {lost} perdidos',
  'equipped {id} in the {slot} slot': '{id} equipado en la ranura {slot}',
  '×{qty} · sells for {gold}g': '×{qty} · se vende por {gold}o',
  'wearing {slot}:{id}': 'llevando {slot}:{id}',
  '{name}': '{name}',
  '{name} · borrowed': '{name} · prestado',
  '{tier} weight': 'peso de {tier}',
  '{value}  (was {was})': '{value}  (antes {was})',
  'this world rolls {list}': 'este mundo saca {list}',
  '{done} of {total} ({percent}%)': '{done} de {total} ({percent}%)',
  'That is not a run: {message}': 'Eso no es una partida: {message}',
  'This tab threw: {message}': 'Esta pestaña ha fallado: {message}',
  'W{id} {world} — {count} riders': 'M{id} {world} — {count} jinetes',
  'W{id} {world} — {count} roads dealt against the run as it stands':
    'M{id} {world} — {count} caminos repartidos contra la partida tal y como está',
  'W{id} {world} — {count} visits, {slots} slots':
    'M{id} {world} — {count} visitas, {slots} ranuras',
  '  mean bullet        {n} lives': '  bala media        {n} vidas',
  '  discounted: {pct}%': '  con descuento: {pct}%',
  '  two buildings in a row: {n} across {count} roads (the floor says it cannot happen while a fight is in reserve)':
    '  dos edificios seguidos: {n} en {count} caminos (la regla dice que no puede pasar mientras haya una pelea en reserva)',
  '  reading: health {health} · belly {belly} · purse {purse} · food {food} · rung {rung}':
    '  lectura: salud {health} · barriga {belly} · bolsa {purse} · comida {food} · peldaño {rung}',
  'was {before}': 'antes {before}',
  'lv {n}': 'nv {n}',
  'gun {n}': 'arma {n}',
  'hunger {n}': 'hambre {n}',
  'slot {n}': 'ranura {n}',
  'road button shown': 'botón del camino visible',
  'road button hidden': 'botón del camino oculto',
  'the kit this world carries · past the ramp':
    'el equipo que lleva este mundo · pasada la rampa',
  // -------------------------------------------------------------------------
  // What the man across the road actually looks like — the tooltip on his name
  // -------------------------------------------------------------------------
  'A sun-bleached hat and a dust-coloured serape':
    'Un sombrero descolorido por el sol y un sarape del color del polvo',
  'Bare-headed, black hair, a red shirt under an open vest':
    'Sin sombrero, pelo negro, una camisa roja bajo un chaleco abierto',
  'A hat with a red bandana pulled up over the face':
    'Un sombrero y un pañuelo rojo subido hasta la cara',
  'A frayed straw hat over sacking': 'Un sombrero de paja deshilachado sobre arpillera',
  'The widest brim on the road, over a blood-red serape':
    'El ala más ancha del camino, sobre un sarape rojo sangre',
  'A brim wider than the man, and a green serape':
    'Un ala más ancha que el hombre, y un sarape verde',
  'A stitched sack for a head and straw coming out of the seams':
    'Un saco cosido por cabeza y paja saliéndose por las costuras',
  'Bare-headed, with fence wire wound round his chest':
    'Sin sombrero, con alambre de espino enrollado al pecho',
  'A bowler, a string tie and a good coat':
    'Un bombín, una corbata de cordón y un buen abrigo',
  'A stovepipe hat, a white collar and a long black coat':
    'Una chistera, un cuello blanco y un abrigo negro largo',
  'A lawman’s star, on a coat the colour of deep space':
    'Una estrella de la ley, sobre un abrigo del color del espacio profundo',
  'A cloak with two cold lights where a face should be':
    'Una capa con dos luces frías donde debería haber una cara',
  'A hood with two lights in it and nothing below the hem':
    'Una capucha con dos luces dentro y nada por debajo del bajo',
  'Wound head to belt in burial linen, and walking anyway':
    'Envuelto de la cabeza al cinto en lino de mortaja, y andando igualmente',
  'A bare skull and a ribcage, and nothing else left':
    'Un cráneo pelado y una caja torácica, y nada más',
  'A bare skull over rags, with nothing under the hem but a trail':
    'Un cráneo pelado sobre harapos, y bajo el bajo solo un rastro',
  'A skull under a hat, and a ribcage over the gun belt':
    'Un cráneo bajo un sombrero, y unas costillas sobre el cinturón',
  'A brim like a coffin lid, two lights in the sockets, and a spade':
    'Un ala como la tapa de un ataúd, dos luces en las cuencas, y una pala',
  'A drawn bag over the head and the rope still round the neck':
    'Un saco atado sobre la cabeza y la cuerda todavía al cuello',
  'Mourning black, a wide hat and crape over the face':
    'Luto riguroso, un sombrero ancho y crespón sobre la cara',
  'A fur hood closed round the face and pelts on the shoulders':
    'Una capucha de piel cerrada sobre la cara y pieles en los hombros',
  'Snow goggles and a hood, with no eyes to read':
    'Gafas de nieve y una capucha, sin ojos que leer',
  'White fur and mirrored goggles, in weather nobody else survives':
    'Piel blanca y gafas de espejo, en un tiempo que no sobrevive nadie más',
  'A coat with the fire showing through the seams':
    'Un abrigo con el fuego asomando por las costuras',
  'Horns through the crown of the hat and lit eyes under it':
    'Cuernos atravesando la copa del sombrero y ojos encendidos debajo',
  'Horns, a burning coat and eyes with the fire behind them':
    'Cuernos, un abrigo ardiendo y ojos con el fuego detrás',
  'A riveted furnace helm with a slit lit from the inside':
    'Un yelmo de horno remachado con una rendija iluminada desde dentro',
  'A hat gone shapeless and a leather apron with the day’s work on it':
    'Un sombrero deformado y un delantal de cuero con el trabajo del día encima',
  'A sealed helmet with stars caught in the visor':
    'Un casco sellado con estrellas atrapadas en la visera',
  'A skull with a star caught in its ribs, and nothing holding it in':
    'Un cráneo con una estrella atrapada entre las costillas, y nada que la retenga',
  'A crown of broken light over a cowl with a sky inside it':
    'Una corona de luz rota sobre una capucha con un cielo dentro',
  'A colonel’s black coat and a stovepipe hat, gold at the collar':
    'El abrigo negro de un coronel y una chistera, con oro en el cuello',

  // -------------------------------------------------------------------------
  // The odds and ends the crawl turned up last
  // -------------------------------------------------------------------------
  Hats: 'Sombreros',
  Shirts: 'Camisas',
  Outfit: 'Atuendo',
  Reward: 'Recompensa',
  'Reward: {garments}.': 'Recompensa: {garments}.',
  'Your horse': 'Tu caballo',
  '{name}. Locked. {reason}': '{name}. Bloqueado. {reason}',
  '{name}. {blurb}': '{name}. {blurb}',
  'World {n} of {total}': 'Mundo {n} de {total}',
  'The last horizon': 'El último horizonte',
  'View ending': 'Ver el final',
  Continue: 'Continuar',
  'just now': 'ahora mismo',
  'Full health': 'Salud completa',
  '1 life down': 'Te falta 1 vida',
  '{count} lives down': 'Te faltan {count} vidas',
  'A real room, a real bath, a real breakfast. Restores every life.':
    'Una habitación de verdad, un baño de verdad, un desayuno de verdad. Recupera todas las vidas.',
  'A real room, a real bath, a real breakfast. Restores 1 life — out here nobody sleeps the whole night.':
    'Una habitación de verdad, un baño de verdad, un desayuno de verdad. Recupera 1 vida: aquí fuera nadie duerme la noche entera.',
  'A real room, a real bath, a real breakfast. Restores {count} lives — out here nobody sleeps the whole night.':
    'Una habitación de verdad, un baño de verdad, un desayuno de verdad. Recupera {count} vidas: aquí fuera nadie duerme la noche entera.',
  'A straw mattress and a thin blanket. Restores 1 life.':
    'Un jergón de paja y una manta fina. Recupera 1 vida.',
  'A straw mattress and a thin blanket. Restores {count} lives.':
    'Un jergón de paja y una manta fina. Recupera {count} vidas.',
  '+1 round': '+1 bala',
  '−1 round': '−1 bala',
  'costs nothing': 'no cuesta nada',
  'Free-for-all': 'Todos contra todos',
  '{name}, {players} of {max} players': '{name}, {players} de {max} jugadores',
  '{name}, private, {players} of {max} players':
    '{name}, privada, {players} de {max} jugadores',
  'WESTERN DUELS': 'DUELOS DEL OESTE',
  'v1.0 · Definitive Edition': 'v1.0 · Edición Definitiva',
  'Version 1 — Roblox': 'Versión 1 — Roblox',
  'Version 2 — Single-file HTML/JS': 'Versión 2 — HTML/JS en un solo archivo',
  'Version 3 — Roblox, rebuilt': 'Versión 3 — Roblox, rehecho',
  'Version 4 — This one': 'Versión 4 — Esta',
  'Sold as part of {set}, at a clothing shop.':
    'Se vende como parte de {set}, en una tienda de ropa.',
  'a complete outfit': 'un atuendo completo',  '{n} left': 'quedan {n}',
  'Sold out': 'Agotado',
  rare: 'raro',
  legendary: 'legendario',
  common: 'común',
  // -------------------------------------------------------------------------
  // The generated ability cards — see `describeAbility` in
  // src/game/world-abilities.js. Every one is a whole sentence, singular and
  // plural both written out, because Spanish agrees AND reorders.
  // -------------------------------------------------------------------------
  'Takes 1 round out of their gun and loads {take} into yours. Charges in {charge} rounds.':
    'Le saca 1 bala del arma y carga {take} en la tuya. Se carga en {charge} rondas.',
  'Takes {count} rounds out of their gun and loads {take} into yours. Charges in {charge} rounds.':
    'Le saca {count} balas del arma y carga {take} en la tuya. Se carga en {charge} rondas.',
  'Takes 1 round out of their gun. Charges in {charge} rounds.':
    'Le saca 1 bala del arma. Se carga en {charge} rondas.',
  'Takes {count} rounds out of their gun. Charges in {charge} rounds.':
    'Le saca {count} balas del arma. Se carga en {charge} rondas.',
  'Empties their cylinder, and {take} of them end up in yours. Charges in {charge} rounds.':
    'Le vacía el tambor, y {take} de esas balas acaban en el tuyo. Se carga en {charge} rondas.',
  'Empties their cylinder. Charges in {charge} rounds.':
    'Le vacía el tambor. Se carga en {charge} rondas.',
  'Trades cylinders with them, whatever is in each. Charges in {charge} rounds.':
    'Intercambia los tambores con él, lleve lo que lleve cada uno. Se carga en {charge} rondas.',
  '1 life at once — but a raised shield stops it dead. Charges in {charge} rounds.':
    '1 vida de golpe, pero un escudo levantado lo para en seco. Se carga en {charge} rondas.',
  '{count} lives at once — but a raised shield stops it dead. Charges in {charge} rounds.':
    '{count} vidas de golpe, pero un escudo levantado lo para en seco. Se carga en {charge} rondas.',
  '1 life, straight through any shield. Charges in {charge} rounds.':
    '1 vida, atravesando cualquier escudo. Se carga en {charge} rondas.',
  '{count} lives, straight through any shield. Charges in {charge} rounds.':
    '{count} vidas, atravesando cualquier escudo. Se carga en {charge} rondas.',
  'One life a round for 1 round. No shield stops it. Charges in {charge} rounds.':
    'Una vida por ronda durante 1 ronda. Ningún escudo lo para. Se carga en {charge} rondas.',
  'One life a round for {count} rounds. No shield stops it. Charges in {charge} rounds.':
    'Una vida por ronda durante {count} rondas. Ningún escudo lo para. Se carga en {charge} rondas.',
  'Takes 1 life off them and gives it to you. Charges in {charge} rounds.':
    'Le quita 1 vida y te la da a ti. Se carga en {charge} rondas.',
  'Takes {count} lives off them and gives them to you. Charges in {charge} rounds.':
    'Le quita {count} vidas y te las da a ti. Se carga en {charge} rondas.',
  'They do nothing at all for 1 round — the turn is yours. Charges in {charge} rounds.':
    'No hace absolutamente nada durante 1 ronda: el turno es tuyo. Se carga en {charge} rondas.',
  'They do nothing at all for {count} rounds — the turns are yours. Charges in {charge} rounds.':
    'No hace absolutamente nada durante {count} rondas: los turnos son tuyos. Se carga en {charge} rondas.',
  'They cannot shoot for 1 round. Charges in {charge} rounds.':
    'No puede disparar durante 1 ronda. Se carga en {charge} rondas.',
  'They cannot shoot for {count} rounds. Charges in {charge} rounds.':
    'No puede disparar durante {count} rondas. Se carga en {charge} rondas.',
  'Their shield stops nothing for 1 round. Charges in {charge} rounds.':
    'Su escudo no para nada durante 1 ronda. Se carga en {charge} rondas.',
  'Their shield stops nothing for {count} rounds. Charges in {charge} rounds.':
    'Su escudo no para nada durante {count} rondas. Se carga en {charge} rondas.',
  'Their next shot goes wide. Charges in {charge} rounds.':
    'Su próximo disparo se desvía. Se carga en {charge} rondas.',
  'Their next {count} shots go wide. Charges in {charge} rounds.':
    'Sus {count} próximos disparos se desvían. Se carga en {charge} rondas.',
  'For 1 round, every shot that hits them costs one extra life. Charges in {charge} rounds.':
    'Durante 1 ronda, cada disparo que le alcance cuesta una vida más. Se carga en {charge} rondas.',
  'For {count} rounds, every shot that hits them costs one extra life. Charges in {charge} rounds.':
    'Durante {count} rondas, cada disparo que le alcance cuesta una vida más. Se carga en {charge} rondas.',
  'Your next shot costs them an extra life. Charges in {charge} rounds.':
    'Tu próximo disparo le cuesta una vida más. Se carga en {charge} rondas.',
  'Your next {count} shots cost them an extra life each. Charges in {charge} rounds.':
    'Tus {count} próximos disparos le cuestan una vida más cada uno. Se carga en {charge} rondas.',
  'The next shot that would hit you goes back at them instead. Charges in {charge} rounds.':
    'El próximo disparo que fuera a alcanzarte le vuelve a él. Se carga en {charge} rondas.',
  'Charges in {charge} rounds.': 'Se carga en {charge} rondas.',
  'Winds up on your rival and fires once: {strikes} lives in a single shot. Charges in {charge} rounds.':
    'Se carga sobre tu rival y dispara una vez: {strikes} vidas en un solo tiro. Se carga en {charge} rondas.',
  'Calls it down on your rival: {strikes} lives over one eruption. Charges in {charge} rounds.':
    'Lo hace caer sobre tu rival: {strikes} vidas repartidas en una erupción. Se carga en {charge} rondas.',  '{n} min ago': 'hace {n} min',
  '{n} h ago': 'hace {n} h',
  '{n} days ago': 'hace {n} días',
  yesterday: 'ayer',
  '{n} slots': '{n} ranuras',  '{done} of {total} earned · {left} still out there':
    '{done} de {total} conseguidos · quedan {left} por ahí',
  'Every last one of them. There is nothing left on this road you have not done.':
    'Hasta el último. No queda nada en este camino que no hayas hecho.',
};
