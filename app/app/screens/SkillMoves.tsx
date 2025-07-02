import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
} from 'react-native';

// Data grouped by star rating
const skillMovesData = [
  {
    rating: '1 Star Skill Moves',
    moves: [
      {
        name: 'Directional Nutmeg',
        ps: 'Hold L1 + R1 + RS direction',
        xbox: 'Tap LB + RB + RS direction',
      },
      {
        name: 'Standing Ball Juggle',
        ps: 'L2 + Tap R1',
        xbox: 'Hold LT + Tap RB',
      },
      {
        name: 'Open Up Fake Shot Left/Right',
        ps: 'Hold L1 + Tap Square then Tap X and move LS top left/right',
        xbox: 'Hold LB + Tap X then Tap A and move LS top left/right',
      },
      {
        name: 'Flick Up',
        ps: 'Tap R3',
        xbox: 'Tap R3',
      },
      {
        name: 'First Time Feint Turn',
        ps: 'Hold L1 + R1 + flick LS down',
        xbox: 'Hold LB + RB + flick LS down',
      },
    ],
  },
  {
    rating: '2 Star Skill Moves',
    moves: [
      {
        name: 'Feint Forward and Turn',
        ps: 'Flick RS down x2',
        xbox: 'Flick RS down x2',
      },
      {
        name: 'Body Feint Right/Left',
        ps: 'Flick RS right/left',
        xbox: 'Flick RS right/left',
      },
      {
        name: 'Stepover Right/Left',
        ps: 'Roll RS front to right/left',
        xbox: 'Roll RS front to right/left',
      },
      {
        name: 'Reverse Stepover Right/Left',
        ps: 'Roll RS right/left to front',
        xbox: 'Roll RS right/left to front',
      },
      {
        name: 'Ball Roll Right/Left',
        ps: 'Hold RS right/left',
        xbox: 'Hold RS right/left',
      },
      {
        name: 'Drag Back',
        ps: 'L1 + R1 + LS flick down',
        xbox: 'LB + RB + LS flick down',
      },
      {
        name: 'Big Feint',
        ps: 'Hold L2 + Flick RS left/Right (+ LS Direction to Exit)',
        xbox: 'Hold LT + Flick RS left/Right (+ LS Direction to Exit)',
      },
      {
        name: 'Stop and Go',
        ps: 'Hold L2 + RS back then forward',
        xbox: 'Hold LT + RS back then forward',
      },
    ],
  },
  {
    rating: '3 Star Skill Moves',
    moves: [
      {
        name: 'Heel Flick',
        ps: 'RS flick up then down',
        xbox: 'RS flick up then down',
      },
      {
        name: 'Roulette Right',
        ps: 'Roll RS clockwise from bottom to right',
        xbox: 'Roll RS clockwise from bottom to right',
      },
      {
        name: 'Roulette Left',
        ps: 'Roll RS anticlockwise from bottom to left',
        xbox: 'Roll RS anticlockwise from bottom to left',
      },
      {
        name: 'Fake Left & Go Right',
        ps: 'Roll RS along the bottom from left to right',
        xbox: 'Roll RS along the bottom from left to right',
      },
      {
        name: 'Fake Right & Go Left',
        ps: 'Roll RS along the bottom from right to left',
        xbox: 'Roll RS along the bottom from right to left',
      },
      {
        name: 'Heel Chop Right/Left',
        ps: 'Hold L2 + Square then X + LS hold right/left',
        xbox: 'Hold LT + X then A + LS hold right/left',
      },
      {
        name: 'Stutter Feint',
        ps: 'Hold L2 + flick RS left then right (or right then left)',
        xbox: 'Hold LT + flick RS left then right (or right then left)',
      },
      {
        name: 'Feint Right & Exit Left',
        ps: 'Roll RS along the bottom from right to left',
        xbox: 'Roll RS along the bottom from right to left',
      },
      {
        name: 'Feint Left & Exit Right',
        ps: 'Roll RS along the bottom from left to right',
        xbox: 'Roll RS along the bottom from left to right',
      },
    ],
  },
  {
    rating: '4 Star Skill Moves',
    moves: [
      {
        name: 'Ball Hop (while standing)',
        ps: 'Hold L1 + press R3',
        xbox: 'Hold LB + press R3',
      },
      {
        name: 'Ball Roll Drag',
        ps: 'Hold L1 + flick RS up then left/right',
        xbox: 'Hold LB + flick RS up then left/right',
      },
      {
        name: 'Drag Back Turn',
        ps: 'Hold L2 + hold RS down',
        xbox: 'Hold LT + hold RS down',
      },
      {
        name: 'Flair Nutmegs',
        ps: 'Hold L1 + R1 then flick RS',
        xbox: 'Hold LB + RB then flick RS',
      },
      {
        name: 'Heel To Heel Flick',
        ps: 'RS flick up then down',
        xbox: 'RS flick up then down',
      },
      {
        name: 'Simple Rainbow',
        ps: 'RS flick down then up twice',
        xbox: 'RS flick down then up twice',
      },
      {
        name: 'Spin Right',
        ps: 'Hold R1 + roll RS clockwise from bottom to right',
        xbox: 'Hold RB + roll RS clockwise from bottom to right',
      },
      {
        name: 'Spin Left',
        ps: 'Hold R1 + roll RS anticlockwise from bottom to left',
        xbox: 'Hold RB + roll RS anticlockwise from bottom to left',
      },
      {
        name: 'Stop and Turn Right/Left (while running)',
        ps: 'RS flick up then right/left',
        xbox: 'RS flick up then right/left',
      },
      {
        name: 'Ball Roll Cut Right',
        ps: 'RS hold left + LS hold right',
        xbox: 'RS hold left + LS hold right',
      },
      {
        name: 'Ball Roll Cut Left',
        ps: 'RS hold right + LS hold left',
        xbox: 'RS hold right + LS hold left',
      },
      {
        name: 'Fake Pass (while standing)',
        ps: 'Hold R2 + Square then X',
        xbox: 'Hold RT + X then A',
      },
      {
        name: 'Fake Pass Exit Right/Left (while standing)',
        ps: 'Hold R2 + Square then X + LS top right/left',
        xbox: 'Hold RT + X then A + LS top right/left',
      },
      {
        name: 'Quick Ball Rolls',
        ps: 'RS hold down',
        xbox: 'RS hold down',
      },
      {
        name: 'Drag To Heel',
        ps: 'Hold L1 + RS flick down then flick right/left',
        xbox: 'Hold LB + RS flick down then flick right/left',
      },
      {
        name: 'Lane Change Right/Left',
        ps: 'Hold L1 + RS hold right/left',
        xbox: 'Hold LB + RS hold right/left',
      },
      {
        name: 'Three Touch Roulette Right/Left',
        ps: 'Hold L2 + RS flick down then flick right/left',
        xbox: 'Hold LT + RS flick down then flick right/left',
      },
      {
        name: 'Drag Back Spin Right/Left',
        ps: 'Hold L2 + Flick RS fwd, flick left/right',
        xbox: 'Hold LT + Flick RS fwd, flick left/right',
      },
      {
        name: 'Heel to Ball Roll',
        ps: 'Hold L1 + flick RS up then down',
        xbox: 'Hold LB + flick RS up then down',
      },
      {
        name: 'Ball Roll Cut',
        ps: 'Hold L1 + flick RS down then up',
        xbox: 'Hold LB + flick RS down then up',
      },
      {
        name: 'Explosive Fake Shot',
        ps: 'Fake Shot + flick LS while running',
        xbox: 'Fake Shot + flick LS while running',
      },
      {
        name: 'Step Over Ball',
        ps: 'Hold L1 + Flick RS forward, left/right',
        xbox: 'Hold LB + Flick RS forward, left/right',
      },
    ],
  },
  {
    rating: '5 Star Skill Moves',
    moves: [
      {
        name: 'Elastico',
        ps: 'Roll RS along the bottom from right to left',
        xbox: 'Roll RS along the bottom from right to left',
      },
      {
        name: 'Reverse Elastico',
        ps: 'Roll RS along the bottom from left to right',
        xbox: 'Roll RS along the bottom from left to right',
      },
      {
        name: 'Advanced Rainbow',
        ps: 'RS flick down, hold up, then flick up',
        xbox: 'RS flick down, hold up, then flick up',
      },
      {
        name: 'Hocus Pocus',
        ps: 'Roll RS from down to left, then back to right',
        xbox: 'Roll RS from bottom to left, then back to right',
      },
      {
        name: 'Triple Elastico',
        ps: 'Roll RS from down to right, then back to left',
        xbox: 'Roll RS from down to right, then back to left',
      },
      {
        name: 'Ball Roll & Flick Right/Left (while running)',
        ps: 'RS hold right/left then flick up',
        xbox: 'RS hold right/left then flick up',
      },
      {
        name: 'Heel Flick Turn',
        ps: 'Hold R2 & R1 + RS flick up then down',
        xbox: 'Hold RT & RB + RS flick up then down',
      },
      {
        name: 'Sombrero Flick (while standing)',
        ps: 'RS flick up, up, down',
        xbox: 'RS flick up, up, down',
      },
      {
        name: 'Turn and Spin Right/Left',
        ps: 'RS flick up then right/left',
        xbox: 'RS flick up then right/left',
      },
      {
        name: 'Ball Roll Fake Right/Left (while standing)',
        ps: 'RS hold right/left then flick left/right',
        xbox: 'RS hold right/left then flick left/right',
      },
      {
        name: 'Ball Roll Fake Turn',
        ps: 'Hold L2 + RS flick up then flick left/right',
        xbox: 'Hold LT + RS flick up then flick left/right',
      },
      {
        name: 'Elastico Chop Right',
        ps: 'Hold R1 + roll RS along bottom left to right',
        xbox: 'Hold RB + roll RS along bottom left to right',
      },
      {
        name: 'Elastico Chop Left',
        ps: 'Hold RT & RB + roll RS along bottom right to left',
        xbox: 'Hold RT & RB + roll RS along bottom right to left',
      },
      {
        name: 'Spin Flick Right/Left',
        ps: 'Hold R2 & R1 + RS flick up then right/left',
        xbox: 'Hold RT & RB + RS flick up then right/left',
      },
      {
        name: 'Flick Over',
        ps: 'RS hold up',
        xbox: 'RS hold up',
      },
      {
        name: 'Tornado Spin Right/Left',
        ps: 'Hold L2 & L1 + RS flick up then flick right/left',
        xbox: 'Hold LT & LB + RS flick up then flick right/left',
      },
      {
        name: 'Rabona Fake (while jogging)',
        ps: 'Hold L2 + Square then X + LS down',
        xbox: 'Hold LT + X then A + LS down',
      },
      {
        name: 'Heel Fake',
        ps: 'Hold L2 + flick RS left, then right',
        xbox: 'Hold LT + flick RS left, then right',
      },
      {
        name: 'Flair Rainbow',
        ps: 'Hold L1 + flick RS down, then up',
        xbox: 'Hold LB + flick RS down, then up',
      },
      {
        name: 'Toe Drag Stepover',
        ps: 'Hold L1 + rotate RS right, back, left / rotate RS left, back, right',
        xbox: 'Hold LB + rotate RS right, back, left / rotate RS left, back, right',
      },
    ],
  },
  {
    rating: '5 Star Juggling Tricks',
    moves: [
      {
        name: 'Sombrero Flick Backwards/Right/Left',
        ps: 'Hold L2 & R1 + RS down/right/left',
        xbox: 'Hold LT & RB + RS down/right/left',
      },
      {
        name: 'Around The World',
        ps: 'Hold L2 + RS 360 clockwise or anticlockwise',
        xbox: 'Hold LT + RS 360 clockwise or anticlockwise',
      },
      {
        name: 'In Air Elastico',
        ps: 'Hold L2 + RS flick right then left',
        xbox: 'Hold LB + RS flick right then left',
      },
      {
        name: 'Reverse In Air Elastico',
        ps: 'Hold L2 + RS flick left then right',
        xbox: 'Hold LB + RS flick left then right',
      },
      {
        name: 'Flick Up For Volley',
        ps: 'Hold LS up',
        xbox: 'Hold LS up',
      },
      {
        name: 'Chest Flick',
        ps: 'Hold L2 + R3 x2',
        xbox: 'Hold LT + R3 x2',
      },
      {
        name: 'T. Around The World',
        ps: 'Hold L2 + RS 360 clockwise then RS flick up',
        xbox: 'Hold LT + RS 360 clockwise then RS flick up',
      },
    ],
  },
];

const SkillMoves = () => {
  console.log("SkillMoves: Component mounted successfully.");
  // We'll store expanded moves in a Set keyed by "catIndex-moveIndex"
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  console.log("SkillMoves: Initial state 'expanded' set to empty. Current size: " + expanded.size);

  const toggleExpand = (key: string) => {
    console.log("SkillMoves: toggleExpand function called for key: " + key);
    setExpanded((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        console.log("SkillMoves: Removing key from expanded set: " + key);
        newSet.delete(key);
      } else {
        console.log("SkillMoves: Adding key to expanded set: " + key);
        newSet.add(key);
      }
      console.log("SkillMoves: 'expanded' state updated. New size: " + newSet.size);
      return newSet;
    });
  };

  console.log("SkillMoves: Rendering main component UI.");
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>FC 25 Skill Moves Guide</Text>
      {skillMovesData.map((category, catIndex) => (
        <View key={catIndex} style={styles.categoryContainer}>
          <Text style={styles.categoryTitle}>{category.rating}</Text>
          {category.moves.map((move, moveIndex) => {
            const key = `${catIndex}-${moveIndex}`;
            const isExpanded = expanded.has(key);
            console.log("SkillMoves: Processing move '" + move.name + "'. Key: " + key + ". Is Expanded: " + isExpanded);
            return (
              <View key={key} style={styles.card}>
                <TouchableOpacity
                  onPress={() => {
                    console.log("SkillMoves: Card header pressed for move: " + move.name + ", key: " + key);
                    toggleExpand(key);
                  }}
                  style={styles.cardHeader}
                >
                  <Text style={styles.moveName}>{move.name}</Text>
                </TouchableOpacity>
                {isExpanded && (
                  <>
                    {console.log("SkillMoves: Details section visible for move: " + move.name)}
                    <View style={styles.details}>
                      <Text style={styles.instruction}>
                        <Text style={styles.bold}>PS4/PS5:</Text> {move.ps}
                      </Text>
                      <Text style={styles.instruction}>
                        <Text style={styles.bold}>Xbox One/Series X:</Text> {move.xbox}
                      </Text>
                    </View>
                  </>
                )}
                {!isExpanded && console.log("SkillMoves: Details section hidden for move: " + move.name)}
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  categoryContainer: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFD700',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 12,
    backgroundColor: '#292929',
  },
  moveName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  details: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  instruction: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  bold: {
    fontWeight: 'bold',
    color: '#FFD700',
  },
  image: {
    width: '100%',
    height: 150,
    resizeMode: 'contain',
    marginTop: 10,
  },
});

export default SkillMoves;