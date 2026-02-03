import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import ColorPicker, {
  Preview,
  Panel,
  HueSlider,
  BrightnessSlider,
} from 'reanimated-color-picker';

export default function ColorModal({
  visible,
  initialColor,
  onDone,
  onCancel,
}) {
  const [picked, setPicked] = useState(initialColor);

  // keep picker in sync when the parent re-opens it
  useEffect(() => setPicked(initialColor), [initialColor]);

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.box}>
          <ColorPicker
            value={picked}                     // controlled value
            onChange={({ hex }) => setPicked(hex)}   // live preview
            onComplete={({ hex }) => setPicked(hex)} // finger lifted
            style={{ width: '100%' }}
            thumbSize={32}
          >
            {/* built-in UI blocks */}
            <Preview hideText />
            <Panel />
            <HueSlider />
            <BrightnessSlider />
          </ColorPicker>

          {/* footer buttons */}
          <View style={styles.row}>
            <TouchableOpacity onPress={onCancel} style={styles.btn}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDone(picked)} style={styles.btn}>
              <Text style={styles.done}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: { width: '90%', backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  btn: { paddingHorizontal: 16, paddingVertical: 8 },
  cancel: { color: '#ff4444' },
  done: { fontWeight: 'bold' },
});
