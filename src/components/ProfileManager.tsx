"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { FontAwesomeIcon } from "@/components/FaIcon";
import { 
  faSpinner, faGlobe, faCog, faCheck, faTimes, faCopy, faExternalLinkAlt, 
  faEye, faEyeSlash, faTerminal, faKey, faPlus, faTrashAlt, faSync, 
  faExclamationTriangle, faCamera 
} from "@fortawesome/free-solid-svg-icons";
import { faGithub, faTwitter, faInstagram } from "@fortawesome/free-brands-svg-icons";
import { GENRE_CATEGORIES_WITH_ICONS, FIELD_CATEGORIES_WITH_ICONS } from "@/lib/ui-constants";

interface ProfileManagerProps {
  user: any; 
  onUpdate: () => void;
  onDeleteClick?: () => void;
}

export function ProfileManager({ user, onUpdate, onDeleteClick }: ProfileManagerProps) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  
  // States
  const [isPublic, setIsPublic] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    bio: "",
    website: "",
    github: "",
    twitter: "",
    instagram: "",
  });
  
  // Interests
  const [interests, setInterests] = useState<{ genres: string[], fields: string[] }>({
    genres: [],
    fields: []
  });

  // Expertise
  const [expertise, setExpertise] = useState<{ fields: string[] }>({
    fields: []
  });

  // API Key State
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  // Image State
  const [profileImage, setProfileImage] = useState<string>("/globe.svg");
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Initialize
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        bio: user.bio || "",
        website: user.social_links?.website || "",
        github: user.social_links?.github || "",
        twitter: user.social_links?.twitter || "",
        instagram: user.social_links?.instagram || "",
      });
      setProfileImage(user.profile_image_url || "/globe.svg");
      setIsPublic(user.is_public !== false);
      
      // Load interests
      if (user.interests) {
          try {
            const savedInterests = typeof user.interests === 'string' 
                ? JSON.parse(user.interests) 
                : user.interests;
            setInterests({
                genres: Array.isArray(savedInterests.genres) ? savedInterests.genres : [],
                fields: Array.isArray(savedInterests.fields) ? savedInterests.fields : [],
            });
          } catch (e) { console.error('Error parsing interests:', e); }
      }

      // Load expertise
      if (user.expertise) {
          try {
            const savedExpertise = typeof user.expertise === 'string'
                ? JSON.parse(user.expertise)
                : user.expertise;
            setExpertise({
                fields: Array.isArray(savedExpertise.fields) ? savedExpertise.fields : [],
            });
          } catch (e) { console.error('Error parsing expertise:', e); }
      }

      setUsernameAvailable(null);
      fetchApiKeys();
    }
  }, [user]);

  // --- API Key Logic ---
  const fetchApiKeys = async () => {
    setLoadingKeys(true);
    const { data } = await supabase.from('api_keys').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false });
    if (data) setApiKeys(data);
    setLoadingKeys(false);
  };

  const generateApiKey = async () => {
      try {
          const key = 'vf_' + Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('');
          
          const { data, error } = await supabase.from('api_keys').insert({
              user_id: user.id,
              api_key: key,
              key_name: 'Vibefolio Personal Key',
              is_active: true
          }).select().single();

          if (error) throw error;
          
          setApiKeys([data, ...apiKeys]);
          setNewKey(key); // Show once
          toast.success("API Key가 발급되었습니다!");
      } catch (e: any) {
          toast.error("API Key 발급 실패: " + e.message);
      }
  };

  const deleteApiKey = async (id: number) => {
      if (!confirm('정말 삭제하시겠습니까? 이 키를 사용하는 모든 앱이 작동을 멈춥니다.')) return;
      await supabase.from('api_keys').update({ is_active: false }).eq('key_id', id);
      setApiKeys(apiKeys.filter(k => k.key_id !== id));
      toast.success("API Key가 삭제되었습니다.");
  };

  // --- Profile Logic ---
  const checkUsername = async (username: string) => {
    if (!username || username === user.username) {
      setUsernameAvailable(null);
      return;
    }
    if (!/^[a-zA-Z0-9_-]{3,}$/.test(username)) {
      setUsernameAvailable(false);
      return;
    }
    const reserved = ['admin', 'api', 'login', 'signup', 'mypage', 'auth', 'project', 'recruit'];
    if (reserved.includes(username)) {
      setUsernameAvailable(false);
      return;
    }

    setChecking(true);
    try {
      const { data } = await supabase.from('profiles').select('id').eq('username', username).neq('id', user.id).maybeSingle();
      setUsernameAvailable(!data);
    } catch {
      setUsernameAvailable(false);
    } finally {
      setChecking(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("이미지 크기는 5MB 이하여야 합니다.");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (usernameAvailable === false) {
      toast.error("사용할 수 없는 아이디입니다.");
      return;
    }

    setLoading(true);
    try {
      let imageUrl = profileImage;

      // Upload new image if selected
      if (imageFile) {
         const fileExt = imageFile.name.split('.').pop();
         const fileName = `${user.id}_${Date.now()}.${fileExt}`;
         const filePath = `${fileName}`;

         const { error: uploadError } = await supabase.storage
            .from('profiles')
            .upload(filePath, imageFile);

         if (uploadError) throw uploadError;

         const { data: { publicUrl } } = supabase.storage
            .from('profiles')
            .getPublicUrl(filePath);
            
         imageUrl = publicUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username: formData.username,
          bio: formData.bio,
          profile_image_url: imageUrl,
          social_links: {
            website: formData.website,
            github: formData.github,
            twitter: formData.twitter,
            instagram: formData.instagram,
          },
          is_public: isPublic,
          interests: interests,
          expertise: expertise,
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success("설정이 저장되었습니다!");
      onUpdate();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "저장 실패");
    } finally {
      setLoading(false);
    }
  };

  const profileUrl = typeof window !== 'undefined' ? `${window.location.origin}/${formData.username}` : '';

  // Helpers
  const toggleGenre = (id: string) => {
      setInterests(prev => ({
          ...prev,
          genres: prev.genres.includes(id) ? prev.genres.filter(g => g !== id) : [...prev.genres, id]
      }));
  };
  const toggleField = (id: string) => {
      setInterests(prev => ({
          ...prev,
          fields: prev.fields.includes(id) ? prev.fields.filter(f => f !== id) : [...prev.fields, id]
      }));
  };
  const toggleExpertise = (id: string) => {
      setExpertise(prev => ({
          ...prev,
          fields: prev.fields.includes(id) ? prev.fields.filter(f => f !== id) : [...prev.fields, id]
      }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* 1. 기본 프로필 설정 */}
        <section className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <FontAwesomeIcon icon={faCog} className="w-6 h-6" />
                    기본 설정
                </h2>
                <Button onClick={handleSave} disabled={loading} className="bg-green-600 hover:bg-green-700">
                    {loading ? <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" /> : "변경사항 저장"}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Profile Image Upload */}
                <div className="col-span-full flex flex-col items-center justify-center py-4">
                     <div className="relative group cursor-pointer">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-white relative">
                            <img 
                                src={profileImage} 
                                alt="Profile" 
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).src = '/globe.svg'; }}
                            />
                            <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10 w-full h-full">
                                <div className="text-white text-xs font-bold flex flex-col items-center gap-1">
                                    <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                                        <FontAwesomeIcon icon={faCamera} className="w-5 h-5" />
                                    </div>
                                    <span>변경하기</span>
                                </div>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleImageUpload} 
                                    className="hidden" 
                                />
                            </label>
                        </div>
                        {/* Camera Icon Badge */}
                        <div className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-md border border-gray-100 text-gray-500 group-hover:text-green-600 transition-colors pointer-events-none z-20">
                            <FontAwesomeIcon icon={faCamera} className="w-5 h-5" />
                        </div>
                     </div>
                     <p className="text-sm text-gray-400 mt-3 font-medium">프로필 이미지를 변경하려면 클릭하세요</p>
                </div>

                {/* 공개 여부 */}
                <div className="col-span-full bg-gray-50 p-6 rounded-xl border border-gray-200 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${isPublic ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                            {isPublic ? <FontAwesomeIcon icon={faEye} className="w-6 h-6" /> : <FontAwesomeIcon icon={faEyeSlash} className="w-6 h-6" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">프로필 공개 설정</h3>
                            <p className="text-sm text-gray-500">
                                {isPublic ? "누구나 내 프로필을 볼 수 있습니다." : "나만 내 프로필을 볼 수 있습니다."}
                            </p>
                        </div>
                     </div>
                     <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>아이디 (URL)</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-400 text-sm">vibefolio.net/</span>
                            <Input 
                                value={formData.username} 
                                onChange={e => {
                                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                                    setFormData({...formData, username: val});
                                    checkUsername(val);
                                }}
                                className="pl-[105px]"
                                placeholder="username"
                            />
                            <div className="absolute right-3 top-2.5">
                                {checking ? <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin text-gray-400" /> :
                                 usernameAvailable === true ? <FontAwesomeIcon icon={faCheck} className="w-4 h-4 text-green-500" /> :
                                 usernameAvailable === false ? <FontAwesomeIcon icon={faTimes} className="w-4 h-4 text-red-500" /> : null}
                            </div>
                        </div>
                        {usernameAvailable === false && <p className="text-xs text-red-500">사용할 수 없는 아이디입니다.</p>}
                        {formData.username && usernameAvailable !== false && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="truncate max-w-[200px]">{profileUrl}</span>
                                <FontAwesomeIcon icon={faCopy} className="w-3 h-3 cursor-pointer hover:text-green-600" onClick={() => {
                                    navigator.clipboard.writeText(profileUrl);
                                    toast.success("복사됨");
                                }} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>한줄 소개</Label>
                        <Textarea 
                            rows={3}
                            value={formData.bio}
                            onChange={e => setFormData({...formData, bio: e.target.value})}
                            placeholder="자기소개를 입력하세요."
                            className="resize-none"
                        />
                    </div>
                </div>
            </div>
        </section>

        {/* 2. 관심사 설정 */}
        <section className="space-y-6">
            <h2 className="text-xl font-bold border-b pb-4">관심사 및 활동 분야</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <Label className="text-lg">관심 장르</Label>
                    <div className="flex flex-wrap gap-2">
                        {GENRE_CATEGORIES_WITH_ICONS.map(g => (
                            <button
                                key={g.value}
                                onClick={() => toggleGenre(g.value)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                                    interests.genres.includes(g.value)
                                    ? 'bg-green-50 border-green-500 text-green-700'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {g.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <Label className="text-lg">활동 형태</Label>
                    <div className="flex flex-wrap gap-2">
                        {FIELD_CATEGORIES_WITH_ICONS.map(f => (
                            <button
                                key={f.value}
                                onClick={() => toggleField(f.value)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                                    interests.fields.includes(f.value)
                                    ? 'bg-purple-50 border-purple-500 text-purple-700'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </section>

        {/* 2.5 전문 분야 (자부심 뱃지) */}
        <section className="space-y-6">
            <h2 className="text-xl font-bold border-b pb-4 flex items-center gap-2">
                전문 분야 🎖️
                <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-tight">Expert Badge</span>
            </h2>
            <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl">
                <p className="text-sm text-blue-700 mb-4 leading-relaxed font-medium">
                    본인의 전문성을 나타낼 수 있는 분야를 선택하세요. 
                    평가 서비스 제공 시 사용자 이름 옆에 <strong>인증 뱃지</strong>로 표시됩니다.
                </p>
                <div className="flex flex-wrap gap-2">
                    {[...GENRE_CATEGORIES_WITH_ICONS, ...FIELD_CATEGORIES_WITH_ICONS].map(item => (
                        <button
                            key={item.value}
                            onClick={() => toggleExpertise(item.value)}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all border-2 shadow-sm ${
                                expertise.fields.includes(item.value)
                                ? 'bg-blue-600 border-blue-600 text-white transform scale-105'
                                : 'bg-white border-gray-100 text-gray-500 hover:border-blue-200 hover:text-blue-600'
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>
        </section>

        {/* 3. 소셜 링크 */}
        <section className="space-y-6">
            <h2 className="text-xl font-bold border-b pb-4">소셜 링크</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="flex items-center gap-2"><FontAwesomeIcon icon={faGlobe} className="w-4 h-4"/>웹사이트</Label>
                    <Input value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} placeholder="https://" />
                </div>
                <div className="space-y-2">
                    <Label className="flex items-center gap-2"><FontAwesomeIcon icon={faGithub} className="w-4 h-4"/>GitHub</Label>
                    <Input value={formData.github} onChange={e => setFormData({...formData, github: e.target.value})} placeholder="URL" />
                </div>
                <div className="space-y-2">
                    <Label className="flex items-center gap-2"><FontAwesomeIcon icon={faTwitter} className="w-4 h-4"/>Twitter (X)</Label>
                    <Input value={formData.twitter} onChange={e => setFormData({...formData, twitter: e.target.value})} placeholder="URL" />
                </div>
                <div className="space-y-2">
                    <Label className="flex items-center gap-2"><FontAwesomeIcon icon={faInstagram} className="w-4 h-4"/>Instagram</Label>
                    <Input value={formData.instagram} onChange={e => setFormData({...formData, instagram: e.target.value})} placeholder="URL" />
                </div>
            </div>
        </section>

        {/* 4. API Key 관리 */}
        <section className="space-y-6 pt-8 border-t">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900">
                        <FontAwesomeIcon icon={faTerminal} className="w-6 h-6 text-gray-700" />
                        Developer API
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        외부 애플리케이션에서 Vibefolio 프로젝트를 업로드할 수 있는 API Key입니다.
                        <br/>
                        <span className="text-red-500 font-medium">* API Key는 타인에게 절대 노출하지 마세요.</span>
                    </p>
                </div>
                <Button onClick={generateApiKey} className="bg-gray-900 text-white hover:bg-gray-800">
                    <FontAwesomeIcon icon={faPlus} className="w-4 h-4 mr-2" /> 새 키 발급
                </Button>
            </div>

            {/* 새 키 발급 알림 */}
            {newKey && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 animate-in zoom-in-95 duration-300">
                    <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                        <FontAwesomeIcon icon={faCheck} className="w-5 h-5" /> 새 API Key가 발급되었습니다!
                    </h4>
                    <p className="text-sm text-green-700 mb-4">
                        이 키는 <strong>지금만 확인할 수 있습니다.</strong> 반드시 복사하여 안전한 곳에 보관하세요.
                    </p>
                    <div className="flex items-center gap-2 bg-white p-3 rounded border border-green-200 font-mono text-sm shadow-inner overflow-hidden">
                        <FontAwesomeIcon icon={faKey} className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="flex-1 truncate select-all font-bold text-gray-800">{newKey}</span>
                        <Button
                            size="sm" variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => {
                                navigator.clipboard.writeText(newKey);
                                toast.success("API Key 복사 완료!");
                            }}
                        >
                            <FontAwesomeIcon icon={faCopy} className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* 키 목록 */}
            <div className="space-y-3">
                 {loadingKeys ? (
                     <div className="text-center py-4 text-gray-400"><FontAwesomeIcon icon={faSpinner} className="w-6 h-6 animate-spin mx-auto"/></div>
                 ) : apiKeys.length === 0 ? (
                     <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400">
                         발급된 API Key가 없습니다.
                     </div>
                 ) : (
                     <div className="border rounded-xl overflow-hidden divide-y">
                         {apiKeys.map((key) => (
                             <div key={key.key_id} className="p-4 bg-white flex items-center justify-between hover:bg-gray-50">
                                 <div className="flex items-center gap-3">
                                     <div className="bg-gray-100 p-2 rounded text-gray-600">
                                         <FontAwesomeIcon icon={faTerminal} className="w-4 h-4" />
                                     </div>
                                     <div>
                                         <div className="font-bold text-sm text-gray-900">{key.key_name || 'Personal Key'}</div>
                                         <div className="font-mono text-xs text-gray-400">
                                             {key.api_key.substring(0, 8)}...****************
                                         </div>
                                     </div>
                                 </div>
                                 <div className="flex items-center gap-3 text-sm text-gray-500">
                                     <span>{new Date(key.created_at).toLocaleDateString()} 발급</span>
                                     <Button 
                                        size="icon" variant="ghost" className="text-red-400 hover:text-red-500 hover:bg-red-50 w-8 h-8"
                                        onClick={() => deleteApiKey(key.key_id)}
                                     >
                                        <FontAwesomeIcon icon={faTrashAlt} className="w-4 h-4" />
                                     </Button>
                                 </div>
                             </div>
                         ))}
                     </div>
                 )}
            </div>
            
            <div className="bg-slate-50 p-4 rounded-lg text-xs font-mono text-slate-600 space-y-1">
                <div className="font-bold mb-2 text-slate-900">[API Usage Example]</div>
                <div>POST https://vibefolio.net/api/projects</div>
                <div>Authorization: Bearer {'<YOUR_API_KEY>'}</div>
                <div>Content-Type: application/json</div>
            </div>
        </section>
        
        {/* 5. 계정 관리 (Danger Zone) */}
        <section className="space-y-6 pt-8 border-t border-red-100">
             <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
                 <FontAwesomeIcon icon={faExclamationTriangle} className="w-6 h-6" /> Danger Zone
             </h2>
             <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center justify-between">
                 <div>
                     <h3 className="font-bold text-red-900">회원 탈퇴</h3>
                     <p className="text-sm text-red-700 mt-1">
                         계정을 삭제하면 모든 프로젝트와 활동 내역이 연구적으로 삭제됩니다.
                     </p>
                 </div>
                 {onDeleteClick && (
                    <Button variant="destructive" onClick={onDeleteClick} className="bg-white text-red-600 border border-red-200 hover:bg-red-100 font-bold">
                        계정 삭제
                    </Button>
                 )}
             </div>
        </section>

        {/* 하단 저장 버튼 (Floating also possible) */}
        <div className="flex justify-end pt-8">
             <Button onClick={handleSave} size="lg" disabled={loading} className="bg-green-600 hover:bg-green-700 shadow-lg px-8">
                {loading ? <FontAwesomeIcon icon={faSpinner} className="w-5 h-5 animate-spin mr-2" /> : "모든 설정 저장"}
            </Button>
        </div>

    </div>
  );
}
