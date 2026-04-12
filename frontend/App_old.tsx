import './global.css';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';

type FormData = {
  name: string;
  email: string;
  role: string;
  url: string;
  platform: string;
  date: string;
  fileName: string;
};

export default function App() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    role: '',
    url: '',
    platform: '',
    date: '',
    fileName: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const nextStep = () => {
    if (step < 4) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View className="space-y-4">
            <Text className="text-xl font-bold text-white">Reporter Info</Text>
            <TextInput
              className="border border-gray-300 rounded p-2 text-white bg-gray-700"
              placeholder="Name"
              placeholderTextColor="#ccc"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
            <TextInput
              className="border border-gray-300 rounded p-2 text-white bg-gray-700"
              placeholder="Email"
              placeholderTextColor="#ccc"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
            />
            <View className="space-y-2">
              <Text className="text-white">Role:</Text>
              {['victim', 'lawyer', 'advocate', 'other'].map((role) => (
                <TouchableOpacity
                  key={role}
                  className={`p-2 rounded ${formData.role === role ? 'bg-blue-500' : 'bg-gray-600'}`}
                  onPress={() => setFormData({ ...formData, role })}
                >
                  <Text className="text-white capitalize">{role}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 2:
        return (
          <View className="space-y-4">
            <Text className="text-xl font-bold text-white">Evidence Details</Text>
            <TextInput
              className="border border-gray-300 rounded p-2 text-white bg-gray-700"
              placeholder="URL where deepfake was found"
              placeholderTextColor="#ccc"
              value={formData.url}
              onChangeText={(text) => setFormData({ ...formData, url: text })}
            />
            <TextInput
              className="border border-gray-300 rounded p-2 text-white bg-gray-700"
              placeholder="Platform"
              placeholderTextColor="#ccc"
              value={formData.platform}
              onChangeText={(text) => setFormData({ ...formData, platform: text })}
            />
            <TextInput
              className="border border-gray-300 rounded p-2 text-white bg-gray-700"
              placeholder="Date discovered (YYYY-MM-DD)"
              placeholderTextColor="#ccc"
              value={formData.date}
              onChangeText={(text) => setFormData({ ...formData, date: text })}
            />
          </View>
        );
      case 3:
        return (
          <View className="space-y-4">
            <Text className="text-xl font-bold text-white">File Upload</Text>
            <TouchableOpacity
              className="bg-blue-500 p-2 rounded"
              onPress={() => setFormData({ ...formData, fileName: 'sample_deepfake.mp4' })}
            >
              <Text className="text-white">Select File</Text>
            </TouchableOpacity>
            {formData.fileName && (
              <Text className="text-white">Selected: {formData.fileName}</Text>
            )}
          </View>
        );
      case 4:
        return (
          <View className="space-y-4">
            <Text className="text-xl font-bold text-white">Review & Submit</Text>
            <ScrollView className="max-h-40">
              <Text className="text-white">Name: {formData.name}</Text>
              <Text className="text-white">Email: {formData.email}</Text>
              <Text className="text-white">Role: {formData.role}</Text>
              <Text className="text-white">URL: {formData.url}</Text>
              <Text className="text-white">Platform: {formData.platform}</Text>
              <Text className="text-white">Date: {formData.date}</Text>
              <Text className="text-white">File: {formData.fileName}</Text>
            </ScrollView>
            <TouchableOpacity
              className="bg-green-500 p-2 rounded"
              onPress={handleSubmit}
            >
              <Text className="text-white">Submit</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  if (submitted) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center p-4">
        <View className="bg-slate-800 p-6 rounded-lg max-w-md w-full">
          <Text className="text-2xl font-bold text-white mb-4">Submission Confirmed</Text>
          <Text className="text-white mb-2">Evidence Hash: abc123def456</Text>
          <Text className="text-white mb-4">Timestamp: 2026-04-12 12:00:00</Text>
          <TouchableOpacity
            className="bg-blue-500 p-2 rounded"
            onPress={() => {
              setSubmitted(false);
              setStep(1);
              setFormData({
                name: '',
                email: '',
                role: '',
                url: '',
                platform: '',
                date: '',
                fileName: '',
              });
            }}
          >
            <Text className="text-white">Start New Submission</Text>
          </TouchableOpacity>
        </View>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-900 justify-center items-center p-4">
      <View className="bg-slate-800 p-6 rounded-lg max-w-md w-full">
        <View className="flex-row justify-between mb-4">
          {[1, 2, 3, 4].map((s) => (
            <View
              key={s}
              className={`w-8 h-8 rounded-full justify-center items-center ${
                s <= step ? 'bg-blue-500' : 'bg-gray-600'
              }`}
            >
              <Text className="text-white text-sm">{s}</Text>
            </View>
          ))}
        </View>
        {renderStep()}
        <View className="flex-row justify-between mt-4">
          {step > 1 && (
            <TouchableOpacity className="bg-gray-600 p-2 rounded" onPress={prevStep}>
              <Text className="text-white">Previous</Text>
            </TouchableOpacity>
          )}
          {step < 4 && (
            <TouchableOpacity className="bg-blue-500 p-2 rounded" onPress={nextStep}>
              <Text className="text-white">Next</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <StatusBar style="light" />
    </View>
  );
}
