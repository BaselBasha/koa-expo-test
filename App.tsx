import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { signup, verifyOtp, login, googleLogin, appleLogin, SignupPayload } from './api';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';

// Complete any pending auth sessions when the app loads
WebBrowser.maybeCompleteAuthSession();

// ─── Google Client IDs ───
// Web client ID from Google Cloud Console (same one the backend uses)
const GOOGLE_WEB_CLIENT_ID = '';
// For native builds, create separate iOS/Android OAuth client IDs in Google Cloud Console
const GOOGLE_IOS_CLIENT_ID = ''; // TODO: Add iOS client ID
const GOOGLE_ANDROID_CLIENT_ID = ''; // TODO: Add Android client ID

type Step = 'signup' | 'otp' | 'login' | 'done';

export default function App() {
  // ── Navigation state ──
  const [step, setStep] = useState<Step>('signup');

  // ── Signup form ──
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phonePrefix, setPhonePrefix] = useState('+962');
  const [phoneSuffix, setPhoneSuffix] = useState('');
  const [role, setRole] = useState<'CLIENT' | 'COACH'>('CLIENT');

  // ── OTP ──
  const [userId, setUserId] = useState('');
  const [otpCode, setOtpCode] = useState('1111'); // pre-filled with FIXED_OTP

  // ── Response display ──
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Google Auth ──
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  });

  // Handle Google auth response
  useEffect(() => {
    if (googleResponse?.type === 'success') {
      // useIdTokenAuthRequest returns the token in params.id_token
      const idToken = googleResponse.params?.id_token;
      if (idToken) {
        handleGoogleToken(idToken);
      } else {
        setError('Google sign-in succeeded but no ID token was returned. Check Google Cloud Console config.');
      }
    } else if (googleResponse?.type === 'error') {
      setError(`Google sign-in error: ${googleResponse.error?.message || 'Unknown error'}`);
    }
  }, [googleResponse]);

  // ── Handlers ──

  const handleSignup = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const payload: SignupPayload = {
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phonePrefix: phonePrefix.trim(),
        phoneSuffix: phoneSuffix.trim(),
        role,
      };
      const res = await signup(payload);
      setResponse(res);
      // Auto-fill userId for the OTP step
      if (res?.data?.userId) {
        setUserId(res.data.userId);
      }
      setStep('otp');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await verifyOtp({ userId, code: otpCode });
      setResponse(res);
      setStep('login');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await login({ email: email.trim(), password });
      setResponse(res);
      setStep('done');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleToken = async (idToken: string) => {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await googleLogin(idToken);
      setResponse(res);
      setStep('done');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setResponse(null);
    try {
      await googlePromptAsync();
    } catch (err: any) {
      setError(`Google sign-in failed: ${err.message}`);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        const res = await appleLogin(credential.identityToken);
        setResponse(res);
        setStep('done');
      } else {
        setError('Apple sign-in succeeded but no identity token was returned.');
      }
    } catch (err: any) {
      if (err.code === 'ERR_REQUEST_CANCELED') {
        // User cancelled — not an error
        setError(null);
      } else {
        setError(`Apple sign-in failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setStep('signup');
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setPhonePrefix('+962');
    setPhoneSuffix('');
    setRole('CLIENT');
    setUserId('');
    setOtpCode('1111');
    setResponse(null);
    setError(null);
  };

  // ── Render helpers ──

  const renderStepIndicator = () => (
    <View style={styles.stepRow}>
      {(['signup', 'otp', 'login'] as Step[]).map((s, i) => (
        <View key={s} style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              step === s && styles.stepCircleActive,
              (['signup', 'otp', 'login'].indexOf(step) > i ||
                step === 'done') &&
              styles.stepCircleDone,
            ]}
          >
            <Text style={styles.stepCircleText}>{i + 1}</Text>
          </View>
          <Text style={styles.stepLabel}>
            {s === 'signup' ? 'Sign Up' : s === 'otp' ? 'OTP' : 'Login'}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderResponseBox = () => {
    if (!response && !error) return null;
    return (
      <View style={[styles.responseBox, error ? styles.errorBox : styles.successBox]}>
        <Text style={styles.responseTitle}>{error ? '❌ Error' : '✅ Response'}</Text>
        <ScrollView style={styles.responseScroll} nestedScrollEnabled>
          <Text style={styles.responseText}>
            {error || JSON.stringify(response, null, 2)}
          </Text>
        </ScrollView>
      </View>
    );
  };

  // ── Social Sign-In Section ──

  const renderSocialSignIn = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>🔐 Social Sign-In</Text>
      <Text style={styles.hint}>Sign in with your social account (creates user in backend + Clerk)</Text>

      {/* Google Sign-In */}
      <TouchableOpacity
        style={[styles.socialBtn, styles.googleBtn]}
        onPress={handleGoogleSignIn}
        disabled={loading || !googleRequest}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={styles.socialBtnContent}>
            <Text style={styles.socialIcon}>G</Text>
            <Text style={styles.socialBtnText}>Sign in with Google</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Apple Sign-In (iOS only) */}
      {Platform.OS === 'ios' && (
        <TouchableOpacity
          style={[styles.socialBtn, styles.appleBtn]}
          onPress={handleAppleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.socialBtnContent}>
              <Text style={styles.socialIcon}></Text>
              <Text style={styles.socialBtnText}>Sign in with Apple</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {Platform.OS !== 'ios' && (
        <Text style={styles.hintSmall}>
          ℹ️ Apple Sign-In is only available on iOS devices
        </Text>
      )}
    </View>
  );

  // ── Screens ──

  const renderSignup = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>1. Sign Up</Text>

      <TextInput style={styles.input} placeholder="First Name" placeholderTextColor="#999" value={firstName} onChangeText={setFirstName} />
      <TextInput style={styles.input} placeholder="Last Name" placeholderTextColor="#999" value={lastName} onChangeText={setLastName} />
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#999" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password (min 8, upper+lower+digit+special)" placeholderTextColor="#999" value={password} onChangeText={setPassword} secureTextEntry />

      <View style={styles.phoneRow}>
        <TextInput style={[styles.input, styles.phonePrefix]} placeholder="+962" placeholderTextColor="#999" value={phonePrefix} onChangeText={setPhonePrefix} />
        <TextInput style={[styles.input, styles.phoneSuffix]} placeholder="7XXXXXXXX" placeholderTextColor="#999" value={phoneSuffix} onChangeText={setPhoneSuffix} keyboardType="phone-pad" />
      </View>

      <View style={styles.roleRow}>
        {(['CLIENT', 'COACH'] as const).map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.roleBtn, role === r && styles.roleBtnActive]}
            onPress={() => setRole(r)}
          >
            <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
              {r}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={handleSignup} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Sign Up</Text>}
      </TouchableOpacity>
    </View>
  );

  const renderOtp = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>2. Verify OTP</Text>
      <Text style={styles.hint}>User ID (auto-filled from signup):</Text>
      <TextInput style={styles.input} placeholder="User ID" placeholderTextColor="#999" value={userId} onChangeText={setUserId} />
      <Text style={styles.hint}>OTP Code (pre-filled with FIXED_OTP 1111):</Text>
      <TextInput style={styles.input} placeholder="OTP Code" placeholderTextColor="#999" value={otpCode} onChangeText={setOtpCode} keyboardType="number-pad" />

      <TouchableOpacity style={styles.primaryBtn} onPress={handleVerifyOtp} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify OTP</Text>}
      </TouchableOpacity>
    </View>
  );

  const renderLogin = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>3. Login</Text>
      <Text style={styles.hint}>Use the same email & password from signup:</Text>
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#999" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#999" value={password} onChangeText={setPassword} secureTextEntry />

      <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Login</Text>}
      </TouchableOpacity>
    </View>
  );

  const renderDone = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>🎉 All Steps Complete!</Text>
      <Text style={styles.hint}>
        The auth flow was tested successfully.
      </Text>
      <TouchableOpacity style={styles.secondaryBtn} onPress={resetAll}>
        <Text style={styles.secondaryBtnText}>Start Over</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.header}>KOA Auth Tester</Text>
          <Text style={styles.subheader}>Expo → Backend Auth Flow</Text>

          {/* Social Sign-In — always visible */}
          {renderSocialSignIn()}

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {renderStepIndicator()}

          {step === 'signup' && renderSignup()}
          {step === 'otp' && renderOtp()}
          {step === 'login' && renderLogin()}
          {step === 'done' && renderDone()}

          {renderResponseBox()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ──

const ACCENT = '#4F46E5';
const BG = '#0F172A';
const CARD_BG = '#1E293B';
const TEXT = '#F1F5F9';
const TEXT_DIM = '#94A3B8';
const SUCCESS_BG = '#064E3B';
const ERROR_BG = '#7F1D1D';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  container: { padding: 20, paddingTop: 50 },
  header: { fontSize: 28, fontWeight: '800', color: TEXT, textAlign: 'center' },
  subheader: { fontSize: 14, color: TEXT_DIM, textAlign: 'center', marginBottom: 24 },

  // Step indicator
  stepRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20, gap: 24 },
  stepItem: { alignItems: 'center' },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center',
  },
  stepCircleActive: { backgroundColor: ACCENT },
  stepCircleDone: { backgroundColor: '#059669' },
  stepCircleText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  stepLabel: { color: TEXT_DIM, fontSize: 11, marginTop: 4 },

  // Card
  card: {
    backgroundColor: CARD_BG, borderRadius: 16, padding: 20, marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: TEXT, marginBottom: 16 },
  hint: { fontSize: 12, color: TEXT_DIM, marginBottom: 6 },
  hintSmall: { fontSize: 11, color: TEXT_DIM, marginTop: 8, textAlign: 'center' },

  // Inputs
  input: {
    backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155',
    borderRadius: 10, padding: 14, color: TEXT, fontSize: 15, marginBottom: 12,
  },
  phoneRow: { flexDirection: 'row', gap: 8 },
  phonePrefix: { flex: 1 },
  phoneSuffix: { flex: 3 },

  // Role
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  roleBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#334155', alignItems: 'center',
  },
  roleBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  roleBtnText: { color: TEXT_DIM, fontWeight: '600' },
  roleBtnTextActive: { color: '#fff' },

  // Buttons
  primaryBtn: {
    backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    borderWidth: 1, borderColor: ACCENT, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  secondaryBtnText: { color: ACCENT, fontSize: 16, fontWeight: '600' },

  // Social buttons
  socialBtn: {
    borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginBottom: 12,
  },
  socialBtnContent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  socialIcon: { fontSize: 18, fontWeight: '800', color: '#fff' },
  socialBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  googleBtn: { backgroundColor: '#4285F4' },
  appleBtn: { backgroundColor: '#000' },

  // Divider
  divider: {
    flexDirection: 'row', alignItems: 'center', marginVertical: 12,
  },
  dividerLine: {
    flex: 1, height: 1, backgroundColor: '#334155',
  },
  dividerText: {
    color: TEXT_DIM, fontSize: 12, fontWeight: '600', marginHorizontal: 16,
  },

  // Response box
  responseBox: { borderRadius: 12, padding: 14, marginTop: 8, maxHeight: 260 },
  successBox: { backgroundColor: SUCCESS_BG },
  errorBox: { backgroundColor: ERROR_BG },
  responseTitle: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 6 },
  responseScroll: { maxHeight: 200 },
  responseText: { color: '#D1FAE5', fontSize: 12, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
});
