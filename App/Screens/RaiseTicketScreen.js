import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  ScrollView,
  Alert,
} from "react-native";

const colors = {
  background: "#F9FAFB",
  text: "#111827",
  card: "#FFFFFF",
  accent: "#10B981",
  muted: "#6B7280",
  border: "#E5E7EB",
  danger: "#EF4444",
};

export default function RaiseTicketScreen({ navigation }) {
  const [showInfo, setShowInfo] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [description, setDescription] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = "Title is required";
    if (!category.trim()) e.category = "Category is required";
    if (!priority.trim()) e.priority = "Priority is required";
    if (!description.trim()) e.description = "Please describe the problem";
    if (!userEmail.trim()) e.userEmail = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(userEmail)) e.userEmail = "Email is invalid";
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const createEmailHTML = (isUserCopy = false) => {
    const currentDate = new Date().toISOString().split('T')[0];
    const platformInfo = `${Platform.OS} ${Platform.Version || ''}`.trim();
    
    if (isUserCopy) {
      return `<!doctype html>
<html lang='en'>
  <head>
    <meta charset='utf-8'>
    <title>Support Ticket Confirmation</title>
    <meta name='viewport' content='width=device-width, initial-scale=1'>
    <style>
      .wrapper { max-width: 640px; margin: 0 auto; padding: 24px; font-family: Arial, Helvetica, sans-serif; color: #374151; }
      .header { background: #10B981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
      .content { background: #F9FAFB; padding: 20px; border-radius: 0 0 8px 8px; }
      .ticket-info { background: white; padding: 16px; margin: 16px 0; border-radius: 8px; border-left: 4px solid #10B981; }
      .label { font-weight: bold; color: #374151; }
      .value { margin-bottom: 12px; }
      .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 14px; }
    </style>
  </head>
  <body>
    <div class='wrapper'>
      <div class='header'>
        <h1>🎫 Support Ticket Received</h1>
        <p>We've received your request and will get back to you soon.</p>
      </div>
      <div class='content'>
        <div class='ticket-info'>
          <div class='value'><span class='label'>Ticket Title:</span><br/>${title}</div>
          <div class='value'><span class='label'>Category:</span><br/>${category}</div>
          <div class='value'><span class='label'>Priority:</span><br/>${priority}</div>
          <div class='value'><span class='label'>Description:</span><br/>${description.replace(/\n/g, '<br/>')}</div>
          <div class='value'><span class='label'>Submitted:</span><br/>${new Date().toLocaleString()}</div>
        </div>
        <p>Our support team will review your ticket and respond within 24-48 hours.</p>
        <div class='footer'>
          <p>Thank you for helping us improve!<br/>Dear-Basket Support Team</p>
        </div>
      </div>
    </div>
  </body>
</html>`;
    } else {
      return `<!doctype html>
<html lang='en'>
  <head>
    <meta charset='utf-8'>
    <title>New Bug Report</title>
    <meta name='viewport' content='width=device-width, initial-scale=1'>
    <style>
      .wrapper { max-width: 700px; margin: 0 auto; padding: 20px; font-family: Arial, Helvetica, sans-serif; }
      .header { background: #EF4444; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
      .content { background: #F3F4F6; padding: 20px; border-radius: 0 0 8px 8px; }
      .bug-info { background: white; padding: 20px; margin: 16px 0; border-radius: 8px; border-left: 4px solid #EF4444; }
      .section { margin-bottom: 20px; }
      .label { font-weight: bold; color: #374151; display: inline-block; width: 120px; }
      .priority-high { background: #FEE2E2; color: #DC2626; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
      .priority-medium { background: #FEF3C7; color: #D97706; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
      .priority-low { background: #D1FAE5; color: #065F46; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
      .user-details { background: #EFF6FF; padding: 16px; border-radius: 8px; margin: 16px 0; }
    </style>
  </head>
  <body>
    <div class='wrapper'>
      <div class='header'>
        <h1>🐛 New Bug Report</h1>
        <p>User has submitted a new support ticket requiring attention</p>
      </div>
      <div class='content'>
        <div class='bug-info'>
          <div class='section'>
            <h3>📋 Ticket Details</h3>
            <p><span class='label'>Title:</span> ${title}</p>
            <p><span class='label'>Category:</span> ${category}</p>
            <p><span class='label'>Priority:</span> <span class="priority-${priority.toLowerCase()}">${priority}</span></p>
            <p><span class='label'>Platform:</span> ${platformInfo}</p>
            <p><span class='label'>Date:</span> ${currentDate}</p>
          </div>
          
          <div class='section'>
            <h3>📝 Description</h3>
            <p style="white-space: pre-line; background: #F8FAFC; padding: 12px; border-radius: 6px;">${description}</p>
          </div>
          
          <div class='user-details'>
            <h3>👤 User Information</h3>
            <p><span class='label'>Email:</span> ${userEmail}</p>
            <p><span class='label'>App Version:</span> x.y.z</p>
            <p><span class='label'>Device:</span> ${Platform.OS}</p>
          </div>
        </div>
        
        <div style="margin-top: 24px; padding: 16px; background: #FEF3C7; border-radius: 8px;">
          <strong>🚨 Action Required:</strong> Please review this bug report and assign appropriate priority for resolution.
        </div>
      </div>
    </div>
  </body>
</html>`;
    }
  };

  const sendEmail = async (toEmail, subject, message, isRetry = false) => {
    try {
      const payload = {
        smtp: {
          host: "mail.metatronnest.com",
          port: 587,
          secure: false,
          user: "admin@metatronnest.com",
          password: "Metatron@2025"
        },
        from: "Dear-Basket Support <admin@metatronnest.com>",
        to: toEmail,
        subject: subject,
        message: message
      };

      const response = await fetch("https://mailserver.metatronnest.com/send-dynamic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error(`Email sending failed to ${toEmail}:`, error);
      if (!isRetry) {
        // Retry once
        console.log("Retrying email send...");
        await new Promise(resolve => setTimeout(resolve, 2000));
        return sendEmail(toEmail, subject, message, true);
      }
      return false;
    }
  };

  const onSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const currentDate = new Date().toISOString().split('T')[0];
      const platformInfo = `${Platform.OS} ${Platform.Version || ''}`.trim();
      
      // Developer email subject
      const devSubject = `[Bug Report • ${priority}] ${title} (${platformInfo}) — ${currentDate}`;
      
      // User email subject
      const userSubject = `Support Ticket Confirmation: ${title}`;

      // Send email to developer
      const devEmailSuccess = await sendEmail(
        "dev.dearbasket@gmail.com",
        devSubject,
        createEmailHTML(false)
      );

      // Send email to user
      const userEmailSuccess = await sendEmail(
        userEmail,
        userSubject,
        createEmailHTML(true)
      );

      if (devEmailSuccess && userEmailSuccess) {
        Alert.alert(
          "Ticket Submitted!",
          "Your support ticket has been submitted successfully. We've sent a confirmation to your email.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } else if (devEmailSuccess) {
        Alert.alert(
          "Ticket Submitted!",
          "Your support ticket has been submitted, but we couldn't send the confirmation email. Our team will still review your issue.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          "Submission Failed",
          "We couldn't submit your ticket at this time. Please try again later or contact support directly.",
          [{ text: "OK" }]
        );
      }

    } catch (error) {
      console.error("Ticket submission error:", error);
      Alert.alert(
        "Error",
        "An unexpected error occurred. Please check your connection and try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text }}>
        🛠️ Raise a Ticket
      </Text>
      <Text style={{ color: colors.muted, marginTop: 6 }}>
        Tell us what's going wrong—we'll get back to you via email.
      </Text>

      {/* Info Toggle */}
      <TouchableOpacity
        onPress={() => setShowInfo(!showInfo)}
        activeOpacity={0.8}
        style={{
          marginTop: 16,
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: 14,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ fontWeight: "700", color: colors.text }}>
          {showInfo ? "ℹ️ Hide" : "ℹ️ How to raise a ticket"}
        </Text>
        {showInfo && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ color: colors.muted, lineHeight: 20 }}>
              • Add a clear <Text style={{ fontWeight: "700" }}>Title</Text> (e.g., "Unable to login").{"\n"}
              • Choose a <Text style={{ fontWeight: "700" }}>Category</Text> (e.g., Login, Payments, UI, Performance).{"\n"}
              • Set <Text style={{ fontWeight: "700" }}>Priority</Text> (Low / Medium / High / Critical).{"\n"}
              • In <Text style={{ fontWeight: "700" }}>Description</Text>, include steps to reproduce, expected vs. actual result, and any error messages.{"\n"}
              • Provide your <Text style={{ fontWeight: "700" }}>Email</Text> so we can respond to your ticket.
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Form Card */}
      <View
        style={{
          marginTop: 16,
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {/* User Email */}
        <Text style={{ color: colors.text, fontWeight: "700" }}>Your Email</Text>
        <TextInput
          value={userEmail}
          onChangeText={setUserEmail}
          placeholder="your.email@example.com"
          placeholderTextColor={colors.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          style={{
            marginTop: 8,
            borderWidth: 1,
            borderColor: errors.userEmail ? colors.danger : colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 12,
            color: colors.text,
          }}
        />
        {errors.userEmail && (
          <Text style={{ color: colors.danger, marginTop: 6 }}>{errors.userEmail}</Text>
        )}

        {/* Title */}
        <Text style={{ color: colors.text, fontWeight: "700", marginTop: 16 }}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., App crashes on startup"
          placeholderTextColor={colors.muted}
          style={{
            marginTop: 8,
            borderWidth: 1,
            borderColor: errors.title ? colors.danger : colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 12,
            color: colors.text,
          }}
        />
        {errors.title && (
          <Text style={{ color: colors.danger, marginTop: 6 }}>{errors.title}</Text>
        )}

        {/* Category */}
        <Text style={{ color: colors.text, fontWeight: "700", marginTop: 16 }}>
          Category
        </Text>
        <TextInput
          value={category}
          onChangeText={setCategory}
          placeholder="Login / Payments / UI / Performance / Other"
          placeholderTextColor={colors.muted}
          style={{
            marginTop: 8,
            borderWidth: 1,
            borderColor: errors.category ? colors.danger : colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 12,
            color: colors.text,
          }}
        />
        {errors.category && (
          <Text style={{ color: colors.danger, marginTop: 6 }}>
            {errors.category}
          </Text>
        )}

        {/* Priority */}
        <Text style={{ color: colors.text, fontWeight: "700", marginTop: 16 }}>
          Priority
        </Text>
        <TextInput
          value={priority}
          onChangeText={setPriority}
          placeholder="Low / Medium / High / Critical"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          style={{
            marginTop: 8,
            borderWidth: 1,
            borderColor: errors.priority ? colors.danger : colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 12,
            color: colors.text,
          }}
        />
        {errors.priority && (
          <Text style={{ color: colors.danger, marginTop: 6 }}>
            {errors.priority}
          </Text>
        )}

        {/* Description */}
        <Text style={{ color: colors.text, fontWeight: "700", marginTop: 16 }}>
          Description
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Steps to reproduce, expected vs. actual, any screenshots or error codes…"
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          style={{
            marginTop: 8,
            borderWidth: 1,
            borderColor: errors.description ? colors.danger : colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 12,
            color: colors.text,
            minHeight: 120,
          }}
        />
        {errors.description && (
          <Text style={{ color: colors.danger, marginTop: 6 }}>
            {errors.description}
          </Text>
        )}

        {/* Submit */}
        <TouchableOpacity
          onPress={onSubmit}
          activeOpacity={0.85}
          disabled={isSubmitting}
          style={{
            marginTop: 18,
            backgroundColor: isSubmitting ? colors.muted : colors.accent,
            paddingVertical: 14,
            borderRadius: 10,
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          <Text
            style={{
              color: "#fff",
              textAlign: "center",
              fontWeight: "700",
              fontSize: 16,
            }}
          >
            {isSubmitting ? "Submitting..." : "Submit Ticket"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Cancel */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        disabled={isSubmitting}
        style={{ 
          marginTop: 14, 
          paddingVertical: 12,
          opacity: isSubmitting ? 0.5 : 1
        }}
      >
        <Text style={{ textAlign: "center", color: colors.muted, fontWeight: "600" }}>
          Cancel
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}