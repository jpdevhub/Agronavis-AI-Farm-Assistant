import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../auth/context/AuthContext';
import { profileApi } from '../../utils/farmApi';
import styles from '../../styles/Onboarding.module.css';

export default function ProfileSetup() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    gender: '',
    dateOfBirth: '',
    yearsOfExperience: '',
    educationLevel: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.fullName || !formData.phoneNumber) {
      setError('Full name and phone number are required');
      setLoading(false);
      return;
    }

    if (!user) {
      setError('You must be logged in to update your profile');
      setLoading(false);
      return;
    }

    try {
      await profileApi.saveProfile({
        full_name: formData.fullName,
        phone_number: formData.phoneNumber,
        gender: formData.gender || undefined,
        date_of_birth: formData.dateOfBirth || undefined,
        years_of_experience: formData.yearsOfExperience
          ? parseInt(formData.yearsOfExperience, 10)
          : undefined,
        education_level: formData.educationLevel || undefined,
      });

      setSuccess('Profile saved!');
      setTimeout(() => router.push('/onboarding/farm'), 800);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save profile';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card} data-hc-target="true">
        {/* Header */}
        <div className={styles.cardHeader}>
          <div className={styles.headerIcon}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div className={styles.headerText}>
            <h1 className={styles.cardTitle}>Farmer Profile</h1>
            <p className={styles.cardSubtitle}>Step 1 of 3 — Tell us about yourself</p>
          </div>
        </div>

        {/* Step progress */}
        <div className={styles.stepBar}>
          <div className={`${styles.step} ${styles.stepActive}`} />
          <div className={styles.step} />
          <div className={styles.step} />
        </div>

        {/* Form body */}
        <div className={styles.cardBody}>
          <p className={styles.welcomeText}>
            Welcome! Fill in your details so we can personalise your farm management experience.
          </p>

          {error && <div className={styles.errorBox}>{error}</div>}
          {success && <div className={styles.successBox}>{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="fullName" className={styles.label}>
                Full Name <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. Rajesh Kumar"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="phoneNumber" className={styles.label}>
                Phone Number <span className={styles.required}>*</span>
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="gender" className={styles.label}>Gender</label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className={styles.select}
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="yearsOfExperience" className={styles.label}>Years of Experience</label>
                <input
                  type="number"
                  id="yearsOfExperience"
                  name="yearsOfExperience"
                  value={formData.yearsOfExperience}
                  onChange={handleChange}
                  min="0"
                  max="60"
                  placeholder="e.g. 10"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="dateOfBirth" className={styles.label}>Date of Birth</label>
                <input
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="educationLevel" className={styles.label}>Education</label>
                <select
                  id="educationLevel"
                  name="educationLevel"
                  value={formData.educationLevel}
                  onChange={handleChange}
                  className={styles.select}
                >
                  <option value="">Select</option>
                  <option value="Primary">Primary</option>
                  <option value="Secondary">Secondary</option>
                  <option value="High School">High School</option>
                  <option value="Bachelor's Degree">Bachelor&apos;s</option>
                  <option value="Master's Degree">Master&apos;s</option>
                  <option value="PhD">PhD</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? 'Saving...' : 'Continue to Farm Setup →'}
            </button>

            <div className={styles.skipLink}>
              <button
                type="button"
                className={styles.skipBtn}
                onClick={() => router.push('/onboarding/farm')}
              >
                Skip for now
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
