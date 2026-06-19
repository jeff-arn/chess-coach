import type { Module } from './types';

export const MODULES: Module[] = [
  {
    id: 'board-awareness',
    title: 'See the whole board',
    orderHint: 10,
    difficulty: 1,
    weaknessTags: ['hangsPieces'],
    content:
      'Many beginners focus only on the piece they are moving and ignore the rest of the board. ' +
      'Before every move, scan the entire board: ask "what can my opponent do next?" and "are any of my pieces undefended?" ' +
      'A quick mental checklist — check all enemy threats, count defenders on every one of your pieces — prevents most blunders.',
    examplePositions: [
      {
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        caption: 'After 1.e4 e5 2.Nf3 Nc6 — scan the whole board before choosing your next move.',
        moves: ['d2d4'],
      },
    ],
    practice: [
      {
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        solution: 'd2d4',
        hint: 'Challenge the center immediately. Which central pawn advance fights for space?',
      },
    ],
    completionCriteria: { practiceToPass: 1 },
  },
  {
    id: 'dont-hang-pieces',
    title: 'Stop giving away pieces',
    orderHint: 20,
    difficulty: 1,
    weaknessTags: ['hangsPieces', 'ignoresThreats'],
    content:
      'A piece is "hanging" when it can be captured for free — no recapture regains material. ' +
      'Before making any move, ask two questions: (1) Am I leaving one of my pieces undefended? ' +
      '(2) Does my move allow my opponent to win material? ' +
      'Count the attackers and defenders on every square you plan to leave or occupy.',
    examplePositions: [
      {
        fen: '4k3/8/8/8/8/8/4R3/4K3 w - - 0 1',
        caption: 'Simple king + rook position: the rook is well-placed and protected.',
        moves: ['e2e7'],
      },
    ],
    practice: [
      {
        fen: 'rnbqkb1r/ppp2ppp/3p4/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
        solution: 'Nxe5',
        hint: 'Is the e5 pawn defended? Count attackers and defenders before taking.',
      },
    ],
    completionCriteria: { practiceToPass: 1 },
  },
  {
    id: 'spot-threats',
    title: 'What is my opponent threatening?',
    orderHint: 30,
    difficulty: 2,
    weaknessTags: ['ignoresThreats', 'hangsPieces'],
    content:
      'After every opponent move, stop and ask: "Why did they play that?" ' +
      'Most beginner losses happen because a threat goes unnoticed for one move. ' +
      'Look for (1) direct attacks on your pieces, (2) forks, (3) checks, and (4) checkmate threats. ' +
      'Only after you have identified the threat should you think about your own plans.',
    examplePositions: [
      {
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R b KQkq - 0 4',
        caption: 'It is Black to move. What is White threatening and how should Black respond?',
        moves: ['f6e4'],
      },
    ],
    practice: [
      {
        fen: 'rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq d6 0 3',
        solution: 'c4d5',
        hint: 'White can capture a pawn. Is it free to take, or is it defended?',
      },
    ],
    completionCriteria: { practiceToPass: 1 },
  },
  {
    id: 'tactics-forks',
    title: 'Forks',
    orderHint: 40,
    difficulty: 2,
    weaknessTags: ['missesTactics'],
    content:
      'A fork is a move that attacks two (or more) enemy pieces at the same time. ' +
      'Because the opponent can only respond to one threat, you usually win material. ' +
      'Knights are the best forking pieces because they move in an L-shape and cannot be blocked. ' +
      'Look for squares where a knight (or queen, bishop, pawn) attacks multiple targets simultaneously.',
    examplePositions: [
      {
        fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        caption: 'Knight on f3 can potentially fork with Ng5 or Ne5 if Black is careless.',
        moves: ['f3e5'],
      },
    ],
    practice: [
      {
        fen: 'r1bqkb1r/ppp2ppp/2np4/4p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 5',
        solution: 'Nxe5',
        hint: 'The knight can take on e5. After Nxe5, does Black have a fork available next move?',
      },
    ],
    completionCriteria: { practiceToPass: 1 },
  },
  {
    id: 'tactics-pins-skewers',
    title: 'Pins and skewers',
    orderHint: 50,
    difficulty: 2,
    weaknessTags: ['missesTactics'],
    content:
      'A pin immobilizes a piece because moving it would expose a more valuable piece behind it. ' +
      'An absolute pin is against the king — the pinned piece literally cannot move legally. ' +
      'A skewer is the reverse: a valuable piece is attacked, forced to move, and the piece behind is captured. ' +
      'Bishops, rooks, and queens deliver pins and skewers along ranks, files, and diagonals.',
    examplePositions: [
      {
        fen: 'r1bqk2r/ppp2ppp/2np1n2/1B2p3/4P3/3P1N2/PPP2PPP/RNBQK2R b KQkq - 1 5',
        caption: 'White bishop on b5 pins the c6 knight against the black king — an absolute pin.',
        moves: ['c6d4'],
      },
    ],
    practice: [
      {
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        solution: 'Bxc6',
        hint: 'The bishop pins the c6 knight. What happens if you take it?',
      },
    ],
    completionCriteria: { practiceToPass: 1 },
  },
  {
    id: 'opening-principles',
    title: 'Open like a pro',
    orderHint: 60,
    difficulty: 2,
    weaknessTags: ['weakOpening'],
    content:
      'Three golden opening rules apply to almost every game: ' +
      '(1) Control the center — place pawns on e4/d4 (or e5/d5 as Black) and keep control. ' +
      '(2) Develop your pieces — bring knights before bishops, avoid moving the same piece twice without good reason. ' +
      '(3) Castle early — put your king to safety before launching an attack. ' +
      'Breaking these rules is fine once you understand them, but violations must be justified.',
    examplePositions: [
      {
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        caption: 'The starting position. White to move: apply opening principles.',
        moves: ['e2e4', 'g1f3', 'f1c4'],
      },
    ],
    practice: [
      {
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
        solution: 'g1f3',
        hint: 'Develop a piece toward the center. Which knight move follows opening principles?',
      },
    ],
    completionCriteria: { practiceToPass: 1 },
  },
  {
    id: 'basic-checkmates',
    title: 'King + queen / king + rook mates',
    orderHint: 70,
    difficulty: 3,
    weaknessTags: ['missesMates', 'weakEndgame'],
    content:
      'Knowing how to deliver checkmate with overwhelming material is essential. ' +
      'King + queen vs king: drive the enemy king to the edge, then use the queen to cut off escape squares while your king assists. ' +
      'King + rook vs king: use the "lawnmower" technique — each rook move cuts the enemy king to a smaller strip. ' +
      'Both mates require precise coordination; rushing often leads to stalemate.',
    examplePositions: [
      {
        fen: '8/8/8/8/8/3K4/8/Q3k3 w - - 0 1',
        caption: 'King + queen vs king. Drive Black to the edge.',
        moves: ['a1a5', 'd3d2', 'a5e5'],
      },
    ],
    practice: [
      {
        fen: '8/8/8/8/8/3K4/8/Q3k3 w - - 0 1',
        solution: 'Qa5',
        hint: 'Cut the black king off from the center. Use queen to restrict king movement.',
      },
    ],
    completionCriteria: { practiceToPass: 1 },
  },
  {
    id: 'king-and-pawn-endgames',
    title: 'King and pawn endgames',
    orderHint: 80,
    difficulty: 3,
    weaknessTags: ['weakEndgame'],
    content:
      'King and pawn endgames decide many games. Key concepts: ' +
      'Opposition — when kings face each other with one square between them, the side NOT to move has the opposition. ' +
      'The rule of the square — draw a square from the pawn to its promotion square; if the defending king can enter that square, it catches the pawn. ' +
      'Passed pawns and key squares — knowing which squares the king must reach to guarantee promotion decides won or drawn positions.',
    examplePositions: [
      {
        fen: '8/8/8/3k4/3P4/3K4/8/8 w - - 0 1',
        caption: 'White king on d3, pawn on d4, black king on d5. Who wins?',
        moves: ['d3e4', 'd5e5', 'd4d5'],
      },
    ],
    practice: [
      {
        fen: '8/8/8/8/3P4/8/8/3K1k2 w - - 0 1',
        solution: 'Kd2',
        hint: 'The king must escort the pawn. Which king move helps the pawn promote?',
      },
    ],
    completionCriteria: { practiceToPass: 1 },
  },
];
