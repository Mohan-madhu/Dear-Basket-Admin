// TicketCreation.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';

export default function TicketCreation({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const submitTicket = () => {
    if (!title || !description) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    
    // Here you would typically send the ticket to your backend
    console.log('Ticket submitted:', { title, description });
    
    Alert.alert('Success', 'Ticket submitted successfully!');
    navigation.goBack();
  };

  return (
    <ScrollView style={{ flex: 1, padding: 20, backgroundColor: '#F9FAFB' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Raise a Ticket</Text>
      
      <Text style={{ marginBottom: 8 }}>Title</Text>
      <TextInput
        style={{ 
          borderWidth: 1, 
          borderColor: '#E5E7EB', 
          borderRadius: 8, 
          padding: 12, 
          marginBottom: 16,
          backgroundColor: 'white'
        }}
        placeholder="Brief description of your issue"
        value={title}
        onChangeText={setTitle}
      />
      
      <Text style={{ marginBottom: 8 }}>Description</Text>
      <TextInput
        style={{ 
          borderWidth: 1, 
          borderColor: '#E5E7EB', 
          borderRadius: 8, 
          padding: 12, 
          marginBottom: 16,
          backgroundColor: 'white',
          height: 120,
          textAlignVertical: 'top'
        }}
        placeholder="Detailed description of the problem..."
        multiline
        value={description}
        onChangeText={setDescription}
      />
      
      <TouchableOpacity
        onPress={submitTicket}
        style={{
          backgroundColor: '#10B981',
          padding: 16,
          borderRadius: 8,
          alignItems: 'center'
        }}
      >
        <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>Submit Ticket</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}