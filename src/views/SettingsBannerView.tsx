import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  Settings,
  Image as ImageIcon,
  Building2,
  Award,
  RefreshCw,
  Download,
  Upload,
  Check,
  AlertTriangle,
  Sparkles,
  Link2,
  Eye,
  Globe,
} from 'lucide-react';

/**
 * Normalizes Google Drive sharing links and standard image URLs into direct embeddable image sources.
 */
const formatGoogleAndWebImageUrl = (rawUrl: string): string => {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();

  // Google Drive format 1: https://drive.google.com/file/d/FILE_ID/view...
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${fileDMatch[1]}`;
  }

  // Google Drive format 2: https://drive.google.com/open?id=FILE_ID or ?id=FILE_ID
  const openIdMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openIdMatch && openIdMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${openIdMatch[1]}`;
  }

  // Google Drive format 3: https://drive.google.com/uc?id=FILE_ID
  const ucMatch = trimmed.match(/\/uc\?id=([a-zA-Z0-9_-]+)/);
  if (ucMatch && ucMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${ucMatch[1]}`;
  }

  return trimmed;
};

export const SettingsBannerView: React.FC = () => {
  const { schoolProfile, updateSchoolProfile, exportDatabaseJson, importDatabaseJson, resetToDefaults } = useData();
  const { isAdmin } = useAuth();

  const [schoolName, setSchoolName] = useState(schoolProfile.schoolName);
  const [schoolId, setSchoolId] = useState(schoolProfile.schoolId);
  const [principalName, setPrincipalName] = useState(schoolProfile.principalName);
  const [principalTitle, setPrincipalTitle] = useState(schoolProfile.principalTitle);
  const [principalMessage, setPrincipalMessage] = useState(schoolProfile.principalMessage);
  const [announcementTicker, setAnnouncementTicker] = useState(schoolProfile.announcementTicker);
  const [bannerUrl, setBannerUrl] = useState(schoolProfile.bannerPhotoUrl);
  const [principalPhotoUrl, setPrincipalPhotoUrl] = useState(schoolProfile.principalPhotoUrl);

  // Banner Google Drive / Web Link states
  const [bannerLinkInput, setBannerLinkInput] = useState(
    schoolProfile.bannerPhotoUrl?.startsWith('data:') ? '' : schoolProfile.bannerPhotoUrl || ''
  );
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState(
    schoolProfile.bannerPhotoUrl?.startsWith('data:') ? '' : schoolProfile.bannerPhotoUrl || ''
  );
  const [bannerLoadError, setBannerLoadError] = useState(false);
  const [bannerLoadSuccess, setBannerLoadSuccess] = useState(false);

  // Principal Google Drive / Web Link states
  const [principalLinkInput, setPrincipalLinkInput] = useState(
    schoolProfile.principalPhotoUrl?.startsWith('data:') ? '' : schoolProfile.principalPhotoUrl || ''
  );
  const [principalPreviewUrl, setPrincipalPreviewUrl] = useState(
    schoolProfile.principalPhotoUrl?.startsWith('data:') ? '' : schoolProfile.principalPhotoUrl || ''
  );
  const [principalLoadError, setPrincipalLoadError] = useState(false);
  const [principalLoadSuccess, setPrincipalLoadSuccess] = useState(false);

  const [savedNotice, setSavedNotice] = useState(false);
  const [importNotice, setImportNotice] = useState('');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateSchoolProfile({
      schoolName,
      schoolId,
      principalName,
      principalTitle,
      principalMessage,
      announcementTicker,
      bannerPhotoUrl: bannerUrl,
      principalPhotoUrl,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'banner' | 'principal') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (field === 'banner') {
        setBannerUrl(result);
        updateSchoolProfile({ bannerPhotoUrl: result });
      } else {
        setPrincipalPhotoUrl(result);
        updateSchoolProfile({ principalPhotoUrl: result });
      }
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    };
    reader.readAsDataURL(file);
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const success = importDatabaseJson(reader.result as string);
      if (success) {
        setImportNotice('Database successfully restored from JSON backup!');
      } else {
        setImportNotice('Failed to restore backup: Invalid JSON format.');
      }
      setTimeout(() => setImportNotice(''), 3500);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#701628] uppercase tracking-wider">
            <span>System Administration</span>
            <span aria-hidden="true">·</span>
            <span>School Branding & Database Configuration</span>
          </div>
          <h2 className="text-xl font-bold text-stone-900 mt-1">
            School Banner Area (2763 × 394 px) & Principal's Bio Settings
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">
            Configure panoramic school hero headers, upload images/GIFs, update leadership statements, and manage data backups
          </p>
        </div>

        {savedNotice && (
          <div className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Changes saved successfully!</span>
          </div>
        )}
      </div>

      {/* 2763 x 394 Ratio Banner Customization Card */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#701628]" />
              <span>School Header Banner (Requested Dimensions: 2763 × 394 px)</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              The official panoramic header supports wide landscape campus photography, school seals, and animated GIFs.
            </p>
          </div>
          <span className="text-[11px] font-mono font-bold bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
            Aspect Ratio: ~7.01 : 1
          </span>
        </div>

        {/* Live Banner Preview Box - Fitted cleanly to full width */}
        <div className="relative w-full rounded-lg overflow-hidden border border-stone-300 shadow-inner bg-stone-950 flex items-center justify-center min-h-[110px]">
          <img
            src={bannerUrl || '/src/assets/images/bnhs_panoramic_campus_1792741601010.jpg'}
            alt="Banner preview"
            referrerPolicy="no-referrer"
            className="w-full h-auto max-h-[260px] object-contain object-center block"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/src/assets/images/bnhs_panoramic_campus_1792741601010.jpg';
            }}
          />
          <div className="absolute right-3 bottom-2 text-[9px] text-white/80 bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">
            Fitted Banner Preview
          </div>
        </div>

        {/* Banner Controls & Upload Options */}
        <div className="space-y-4 pt-2">
          {/* Google Drive or Valid Web Link Banner Input with Live Preview */}
          <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-300/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-700" />
                <span>Use Google Drive Link or Any Valid Web Image Link</span>
              </label>
              <span className="text-[11px] font-semibold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300/60">
                Instant Auto-Formatting & Live Preview
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                placeholder="Paste Google Drive link (e.g. https://drive.google.com/file/d/...) or web image link"
                value={bannerLinkInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setBannerLinkInput(val);
                  const formatted = formatGoogleAndWebImageUrl(val);
                  setBannerPreviewUrl(formatted);
                  setBannerLoadError(false);
                  setBannerLoadSuccess(false);
                  if (formatted) {
                    setBannerUrl(formatted);
                  }
                }}
                className="flex-1 text-xs border border-stone-300 rounded-lg p-2.5 bg-white font-mono focus:ring-2 focus:ring-[#701628] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const formatted = formatGoogleAndWebImageUrl(bannerLinkInput);
                  if (formatted) {
                    setBannerUrl(formatted);
                    updateSchoolProfile({ bannerPhotoUrl: formatted });
                    setSavedNotice(true);
                    setTimeout(() => setSavedNotice(false), 2500);
                  }
                }}
                className="px-4 py-2 bg-[#701628] hover:bg-[#5a101f] text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap shadow-xs flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Banner Link</span>
              </button>
            </div>

            {/* Instant Live Link Preview (shows preview same as computer upload) */}
            {bannerPreviewUrl && (
              <div className="p-3 bg-white rounded-lg border border-amber-300 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-800 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-amber-600" />
                    <span>Google Link Live Preview (Fitted)</span>
                  </span>
                  {bannerLoadSuccess && (
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Live Preview Active</span>
                    </span>
                  )}
                  {bannerLoadError && (
                    <span className="text-[11px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                      <span>Permission Check Required</span>
                    </span>
                  )}
                </div>

                <div className="relative w-full rounded-lg overflow-hidden border border-stone-200 bg-stone-950 flex items-center justify-center min-h-[90px] max-h-[170px]">
                  <img
                    src={bannerPreviewUrl}
                    alt="Banner link preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-auto max-h-[170px] object-contain block"
                    onLoad={() => {
                      setBannerLoadSuccess(true);
                      setBannerLoadError(false);
                    }}
                    onError={() => {
                      setBannerLoadError(true);
                      setBannerLoadSuccess(false);
                    }}
                  />
                </div>

                {bannerLoadError ? (
                  <p className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded border border-rose-200 leading-relaxed">
                    <strong>Notice:</strong> Unable to load image preview from this link. If using Google Drive, make sure the file's General Access is set to <em>"Anyone with the link can view"</em>.
                  </p>
                ) : (
                  <p className="text-[11px] text-emerald-800 bg-emerald-50/70 p-1.5 rounded border border-emerald-200 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Google Drive / Web image preview loaded successfully! Click <strong>"Apply Banner Link"</strong> to publish it to the school banner.</span>
                  </p>
                )}
              </div>
            )}

            <p className="text-[11px] text-amber-900/80">
              <strong>Google Drive Note:</strong> Ensure the file in Google Drive has permissions set to <em>"Anyone with the link can view"</em>. Both image files (.png, .jpg) and animated .gif files are supported.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Select Preset High-Resolution Banner
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const url = '/src/assets/images/bnhs_panoramic_campus_1792741601010.jpg';
                    setBannerUrl(url);
                    setBannerLinkInput('');
                    setBannerPreviewUrl('');
                    updateSchoolProfile({ bannerPhotoUrl: url });
                  }}
                  className={`p-2 rounded border text-left text-xs transition-colors ${
                    bannerUrl.includes('panoramic')
                      ? 'border-[#701628] bg-amber-50 text-[#701628] font-bold'
                      : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  🏫 BNHS Campus Panorama (Preset)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const url = 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=2763&h=394&q=80';
                    setBannerUrl(url);
                    setBannerLinkInput('');
                    setBannerPreviewUrl('');
                    updateSchoolProfile({ bannerPhotoUrl: url });
                  }}
                  className={`p-2 rounded border text-left text-xs transition-colors ${
                    bannerUrl.includes('unsplash')
                      ? 'border-[#701628] bg-amber-50 text-[#701628] font-bold'
                      : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  🎓 Academic Hall Panorama
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Or Upload from Computer (PNG, JPG, or Animated GIF)
              </label>
              <label className="flex items-center justify-center gap-2 p-2 border-2 border-dashed border-stone-300 rounded-lg text-xs font-semibold text-stone-600 hover:border-[#701628] hover:text-[#701628] cursor-pointer transition-colors bg-stone-50">
                <Upload className="w-4 h-4" />
                <span>Choose local image / GIF to publish...</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'banner')}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-stone-400 mt-1">
                Optimal image resolution: 2763 pixels wide by 394 pixels high (fits full banner area).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Principal Profile & School Settings Form */}
      <form onSubmit={handleSaveProfile} className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs space-y-5">
        <div className="border-b border-stone-100 pb-3">
          <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-600" />
            <span>School Identification & Principal's Profile</span>
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Content displayed on the main dashboard and official printable DepEd supervision sheets.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-bold text-stone-700 mb-1">School Name</label>
            <input
              type="text"
              required
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full border border-stone-300 rounded-lg p-2 font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">Official DepEd School ID</label>
            <input
              type="text"
              required
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className="w-full border border-stone-300 rounded-lg p-2 font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">Principal / School Head Name</label>
            <input
              type="text"
              required
              value={principalName}
              onChange={(e) => setPrincipalName(e.target.value)}
              className="w-full border border-stone-300 rounded-lg p-2 font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">Official Position Title</label>
            <input
              type="text"
              required
              value={principalTitle}
              onChange={(e) => setPrincipalTitle(e.target.value)}
              className="w-full border border-stone-300 rounded-lg p-2"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-bold text-stone-700 mb-1">
              Homepage Announcement Ticker (Top Banner)
            </label>
            <input
              type="text"
              value={announcementTicker}
              onChange={(e) => setAnnouncementTicker(e.target.value)}
              placeholder="Announcements, deadlines, or instructional notices..."
              className="w-full border border-stone-300 rounded-lg p-2 font-medium"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block font-bold text-stone-700 mb-1">
              Principal's Welcome Statement (Displayed on Dashboard)
            </label>
            <textarea
              rows={3}
              required
              value={principalMessage}
              onChange={(e) => setPrincipalMessage(e.target.value)}
              className="w-full border border-stone-300 rounded-lg p-2 leading-relaxed"
            />
          </div>
        </div>

        {/* Principal / School Head Photo Management: Google Link & Computer Upload */}
        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/80 pb-3">
            <div>
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#701628]" />
                <span>Principal / School Head Photo Management</span>
              </h4>
              <p className="text-[11px] text-stone-500">
                Upload from your computer or link directly via Google Drive / Web image link for dashboard and official reports.
              </p>
            </div>
            <span className="text-[10px] font-semibold bg-stone-200 text-stone-700 px-2 py-0.5 rounded">
              Recommended: 1:1 Square Portrait
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            {/* Live Portrait Preview Box */}
            <div className="md:col-span-4 flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-stone-200 shadow-2xs text-center">
              <div className="relative">
                <img
                  src={principalPhotoUrl || '/src/assets/images/bnhs_principal_portrait_1792741601071.jpg'}
                  alt={principalName}
                  referrerPolicy="no-referrer"
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl object-cover border-2 border-amber-500/40 shadow-sm"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/src/assets/images/bnhs_principal_portrait_1792741601071.jpg';
                  }}
                />
                <div className="absolute -bottom-1 -right-1 bg-[#701628] text-amber-300 p-1 rounded-full shadow-xs">
                  <Award className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 font-bold text-xs text-stone-900 truncate max-w-[180px]">
                {principalName || 'Principal'}
              </div>
              <div className="text-[10px] text-[#701628] font-medium truncate max-w-[180px]">
                {principalTitle || 'School Head'}
              </div>
              <div className="text-[10px] text-stone-400 mt-0.5">
                Current Active Portrait
              </div>
            </div>

            {/* Upload Options */}
            <div className="md:col-span-8 space-y-3">
              {/* Option 1: Google Drive Link or Web Link */}
              <div className="p-3 bg-white rounded-xl border border-amber-200/80 shadow-2xs space-y-2">
                <label className="block text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>Option 1: Upload / Set via Google Drive Link or Web Link</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    placeholder="Paste Google Drive link (e.g. https://drive.google.com/file/d/...) or web image link"
                    value={principalLinkInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPrincipalLinkInput(val);
                      const formatted = formatGoogleAndWebImageUrl(val);
                      setPrincipalPreviewUrl(formatted);
                      setPrincipalLoadError(false);
                      setPrincipalLoadSuccess(false);
                      if (formatted) {
                        setPrincipalPhotoUrl(formatted);
                      }
                    }}
                    className="flex-1 text-xs border border-stone-300 rounded-lg p-2 font-mono bg-stone-50/50 focus:ring-2 focus:ring-[#701628] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const formatted = formatGoogleAndWebImageUrl(principalLinkInput);
                      if (formatted) {
                        setPrincipalPhotoUrl(formatted);
                        updateSchoolProfile({ principalPhotoUrl: formatted });
                        setSavedNotice(true);
                        setTimeout(() => setSavedNotice(false), 2500);
                      }
                    }}
                    className="px-3.5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap shadow-xs flex items-center justify-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply Photo Link</span>
                  </button>
                </div>

                {/* Google Link Live Preview (if provided) */}
                {principalPreviewUrl && (
                  <div className="mt-2 p-2 bg-amber-50/50 rounded-lg border border-amber-200 flex items-center gap-3">
                    <img
                      src={principalPreviewUrl}
                      alt="Google Link Preview"
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-lg object-cover border border-stone-300 shrink-0"
                      onLoad={() => {
                        setPrincipalLoadSuccess(true);
                        setPrincipalLoadError(false);
                      }}
                      onError={() => {
                        setPrincipalLoadError(true);
                        setPrincipalLoadSuccess(false);
                      }}
                    />
                    <div className="text-[11px] flex-1 min-w-0">
                      {principalLoadSuccess && (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Photo Preview Verified & Ready!</span>
                        </span>
                      )}
                      {principalLoadError && (
                        <span className="text-rose-600 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Ensure Google Drive file permission is set to "Anyone with the link can view"</span>
                        </span>
                      )}
                      {!principalLoadSuccess && !principalLoadError && (
                        <span className="text-stone-500">Loading photo preview from link...</span>
                      )}
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-stone-500">
                  Google Drive links will automatically convert to direct image format. Ensure Google Drive link permissions are shared as "Anyone with the link can view".
                </p>
              </div>

              {/* Option 2: Upload from Computer & Presets */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <label className="flex items-center gap-1.5 px-3 py-1.5 border border-stone-300 hover:bg-white rounded-lg text-xs font-semibold cursor-pointer bg-stone-100/70 transition-colors">
                  <Upload className="w-3.5 h-3.5 text-stone-600" />
                  <span>Option 2: Upload Photo from Computer (PNG, JPG, GIF)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'principal')}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    const preset = '/src/assets/images/bnhs_principal_portrait_1792741601071.jpg';
                    setPrincipalPhotoUrl(preset);
                    setPrincipalLinkInput('');
                    setPrincipalPreviewUrl('');
                    updateSchoolProfile({ principalPhotoUrl: preset });
                    setSavedNotice(true);
                    setTimeout(() => setSavedNotice(false), 2500);
                  }}
                  className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 border border-stone-200 rounded-lg hover:bg-white transition-colors"
                >
                  Reset to Default Portrait
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-stone-200">
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#701628] hover:bg-[#580e1c] text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Save Profile & Banner Settings</span>
          </button>
        </div>
      </form>

      {/* Database Persistence & JSON Backup / Restore */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs space-y-4">
        <div className="border-b border-stone-100 pb-3">
          <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-stone-700" />
            <span>Database Backup, Restore & Synchronized Storage</span>
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Export a full JSON snapshot of all Barobo NHS evaluation records or import a backup file to synchronize across computers.
          </p>
        </div>

        {importNotice && (
          <div className="p-3 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-bold">
            {importNotice}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 flex flex-col justify-between">
            <div>
              <div className="font-bold text-stone-900 mb-1">Download Backup (.JSON)</div>
              <p className="text-[11px] text-stone-500">
                Saves teachers, observations, DLL checklists, PMCF records, and profile settings to your local computer.
              </p>
            </div>
            <button
              onClick={exportDatabaseJson}
              className="mt-4 w-full py-2 bg-[#701628] hover:bg-[#580e1c] text-white font-bold rounded-lg flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON Backup</span>
            </button>
          </div>

          <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 flex flex-col justify-between">
            <div>
              <div className="font-bold text-stone-900 mb-1">Restore from Backup</div>
              <p className="text-[11px] text-stone-500">
                Load a previously saved .JSON backup file to restore records or sync from another teacher's machine.
              </p>
            </div>
            <label className="mt-4 w-full py-2 bg-stone-800 hover:bg-stone-900 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Import JSON File</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleImportJsonFile}
                className="hidden"
              />
            </label>
          </div>

          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 flex flex-col justify-between">
            <div>
              <div className="font-bold text-rose-900 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Reset to Factory Defaults</span>
              </div>
              <p className="text-[11px] text-rose-700">
                Restores the initial Barobo NHS starter roster, sample COT observations, and sample lesson plans.
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm('Reset all records to initial Barobo NHS demo starter dataset?')) {
                  resetToDefaults();
                  setImportNotice('Reset to Barobo NHS starter defaults complete.');
                  setTimeout(() => setImportNotice(''), 3000);
                }
              }}
              className="mt-4 w-full py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-lg"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
