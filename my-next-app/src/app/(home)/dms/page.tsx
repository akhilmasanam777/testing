"use client";

import { use, useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { FileText, ArrowLeft, Upload, Plus, Image, Video, File, } from "lucide-react";
import Link from "next/link";

type DMSFolder = {
    Id: number;
    Name: string;
    VirtualPath: string;
    isvirtual: number;
    virtualtype: string;
};

type DMSFile = {
    Name: string;
    Path: string;
    VirtualPath: string;
    Extention: string;
    Size?: string;
    Modified?: string;
};

type DMSModel = {
    Folder: DMSFolder[];
    Files: DMSFile[];
};

type DMSItem = {
    id: string;
    name: string;
    type: 'folder' | 'file';
    path?: string;
    ext?: string;
    folderData?: DMSFolder;
    fileData?: DMSFile;
};

type TrailItem = {
    folderId: string;
    isvirtual: string;
    virtualtype: string;
    name: string;
};

export default function DMSPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const folderId = searchParams.get("folderId") || searchParams.get("folderid") || "0";
    const isVirtual = searchParams.get("isvirtual") || searchParams.get("isVirtual") || "0";
    const virtualType = searchParams.get("virtualtype") || searchParams.get("virtualType") || "Package";
    const pathname = usePathname();

    const [model, setModel] = useState<DMSModel | null>(null);
    const [items, setItems] = useState<DMSItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [trail, setTrail] = useState<TrailItem[]>([]);

    // Modal states
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [showGallery, setShowGallery] = useState(false);
    const [galleryIndex, setGalleryIndex] = useState(0);
    const [galleryFiles, setGalleryFiles] = useState<DMSFile[]>([]);

    // Download states
    const [showDownloadProgress, setShowDownloadProgress] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [downloadMessage, setDownloadMessage] = useState("");
    const [downloadCancelled, setDownloadCancelled] = useState(false);
    const [downloadInterval, setDownloadInterval] = useState<NodeJS.Timeout | null>(null);
    const [currentProgressId, setCurrentProgressId] = useState<string | null>(null);

    // Form states
    const [folderName, setFolderName] = useState("");
    const [selectedPackage, setSelectedPackage] = useState("");
    const [packages, setPackages] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [loadingPackages, setLoadingPackages] = useState(false);

    const openCreateFolder = async () => {
        setFolderName("");
        setPackages([]);
        setSelectedPackage("");
        setShowCreateFolder(true);
        setLoadingPackages(true);
        await loadPackages();
        setLoadingPackages(false);
    };

    // useEffect(() => {console.log( `packates: ${packages}`)}, [packages])
    
    useEffect(() => {
        async function loadDMSData() {
            try {
                setLoading(true);
                const params = new URLSearchParams({
                    folderId,
                    isvirtual: isVirtual,
                    virtualtype: virtualType,
                });
                console.log(`[DMS Page] Loading data with params:`, params.toString());
                
                const res = await fetch(`/api/dms?${params}`);
                const text = await res.text();
                let data: any;

                try {
                    data = JSON.parse(text);
                } catch (parseError) {
                    console.error("[DMS Page] Non-JSON response received:", text);
                    throw new Error(`Unexpected response from /api/dms: ${res.status}`);
                }

                console.log(`[DMS Page] Response status: ${res.status}`, data);

                if (!res.ok) {
                    throw new Error(data?.error || `Failed to load DMS data. Status ${res.status}`);
                }

                // Handle the model structure
                const dmsModel: DMSModel = data;
                setModel(dmsModel);

                // Convert to items
                const folderItems: DMSItem[] = (dmsModel.Folder || []).map(f => ({
                    id: f.Id.toString(),
                    name: f.Name,
                    type: 'folder' as const,
                    folderData: f
                }));

                const fileItems: DMSItem[] = (dmsModel.Files || []).map(f => ({
                    id: f.Name, // files don't have ID, use name
                    name: f.Name,
                    type: 'file' as const,
                    path: f.Path,
                    ext: f.Extention,
                    fileData: f
                }));

                setItems([...folderItems, ...fileItems]);

                // Build gallery files for media
                const mediaFiles = (dmsModel.Files || []).filter(f => 
                    ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi'].includes((f.Extention || '').toLowerCase())
                );
                setGalleryFiles(mediaFiles);

            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : "Unknown error";
                console.error("[DMS Page] Error:", errorMsg);
                setError(errorMsg);
            } finally {
                setLoading(false);
            }
        }

        loadDMSData();
    }, [folderId, isVirtual, virtualType]);

    const handleItemClick = (item: DMSItem) => {
        if (item.type === 'folder' && item.folderData) {
            const newTrail = [...trail];
            if (!newTrail.find(t => t.folderId === item.id)) {
                newTrail.push({
                    folderId: item.id,
                    isvirtual: item.folderData.isvirtual.toString(),
                    virtualtype: item.folderData.virtualtype,
                    name: item.name
                });
            }
            setTrail(newTrail);
            
            const currentPath = pathname || "/DMS";
            router.push(`${currentPath}?folderId=${item.id}&isvirtual=${item.folderData.isvirtual}&virtualtype=${item.folderData.virtualtype}`);
        } else if (item.type === 'file' && item.fileData) {
            const ext = (item.fileData.Extention || '').toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi'].includes(ext)) {
                const index = galleryFiles.findIndex(f => f.Path === item.fileData?.Path);
                if (index >= 0) {
                    setGalleryIndex(index);
                    setShowGallery(true);
                }
            } else {
                window.open(item.fileData.Path, '_blank');
            }
        }
    };

    const handleCreateFolder = async () => {
        if (!folderName.trim()) return;

        try {
            const res = await fetch('/api/dms/folder/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ParentFolderId: parseInt(folderId),
                    FolderName: folderName,
                    PackageId: selectedPackage || 0
                })
            });

            if (res.ok) {
                setShowCreateFolder(false);
                setFolderName("");
                // Refresh data
                window.location.reload();
            }
        } catch (err) {
            console.error('Create folder error:', err);
        }
    };

    const handleFileUpload = async (file: File) => {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('FolderId', folderId);
            formData.append('isvirtual', isVirtual);
            formData.append('virtualtype', virtualType);
            formData.append('file', file);

            const res = await fetch('/api/dms/file/upload', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                setShowUpload(false);
                // Refresh data
                window.location.reload();
            }
        } catch (err) {
            console.error('Upload error:', err);
        } finally {
            setUploading(false);
        }
    };

    const loadPackages = async () => {
        try {
            const res = await fetch('https://bnpapp.traxion.in/api/dropdowns/GetPackage?id=0&id2=0');
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Failed to load packages: ${res.status} ${text}`);
            }

            const data = await res.json();
            console.log('DMS loadPackages response:', data);

            const packagesArray = Array.isArray(data)
                ? data
                : Array.isArray(data?.data)
                    ? data.data
                    : Array.isArray(data?.response)
                        ? data.response
                        : Array.isArray(data?.result)
                            ? data.result
                            : Array.isArray(data?.records)
                                ? data.records
                                : Object.values(data).find(Array.isArray) ?? [];

            console.log('DMS packages array:', packagesArray);
            setPackages(packagesArray);

            if (packagesArray.length > 0) {
                const firstPackage = packagesArray[0];
                const firstValue = firstPackage.Value ?? firstPackage.value ?? firstPackage.Id ?? firstPackage.id ?? firstPackage.PackageId ?? firstPackage.packageId ?? "";
                setSelectedPackage(String(firstValue));
            }
        } catch (err) {
            console.error('Load packages error:', err);
            setPackages([]);
        }
    };

    const downloadAllFiles = async () => {
        try {
            // Reset state
            setDownloadCancelled(false);
            setDownloadProgress(0);
            setDownloadMessage("Preparing download...");
            setShowDownloadProgress(true);

            const progressId = Date.now().toString();
            setCurrentProgressId(progressId);
            const folderName = model?.Folder?.[0]?.Name || "AllFiles";

            // Start the download process
            const startRes = await fetch('/api/dms/downloadall/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    folderId: parseInt(folderId),
                    isvirtual: parseInt(isVirtual),
                    virtualtype: virtualType,
                    folderName,
                    progressId
                })
            });

            if (!startRes.ok) {
                throw new Error('Failed to start download');
            }

            // Start polling for progress
            const interval = setInterval(async () => {
                if (downloadCancelled) {
                    clearInterval(interval);
                    setDownloadInterval(null);
                    setCurrentProgressId(null);
                    setShowDownloadProgress(false);
                    return;
                }

                try {
                    const progressRes = await fetch(`/api/dms/downloadall/progress?progressId=${progressId}`);
                    if (!progressRes.ok) return;

                    const data = await progressRes.json();

                    if (data.TotalFiles > 0) {
                        const percent = Math.round((data.ProcessedFiles / data.TotalFiles) * 100);
                        setDownloadProgress(percent);
                        setDownloadMessage(data.Message || "Processing...");
                    }

                    if (data.Cancelled) {
                        clearInterval(interval);
                        setDownloadInterval(null);
                        setCurrentProgressId(null);
                        setDownloadMessage("Download cancelled");
                        setTimeout(() => setShowDownloadProgress(false), 2000);
                        return;
                    }

                    if (data.Completed) {
                        clearInterval(interval);
                        setDownloadInterval(null);
                        setCurrentProgressId(null);
                        setDownloadMessage("Download complete! Starting file download...");

                        // Trigger the actual download
                        const link = document.createElement('a');
                        link.href = `/api/dms/downloadall/download?progressId=${progressId}&folderName=${encodeURIComponent(folderName)}`;
                        link.download = `${folderName}.zip`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);

                        setTimeout(() => setShowDownloadProgress(false), 2000);
                    }
                } catch (err) {
                    console.error('Progress check error:', err);
                }
            }, 1000);

            setDownloadInterval(interval);

        } catch (err) {
            console.error('Download all files error:', err);
            setShowDownloadProgress(false);
            alert('Failed to start download. Please try again.');
        }
    };

    const cancelDownload = async () => {
        setDownloadCancelled(true);

        if (downloadInterval) {
            clearInterval(downloadInterval);
            setDownloadInterval(null);
        }

        try {
            if (currentProgressId) {
                await fetch('/api/dms/downloadall/cancel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ progressId: currentProgressId })
                });
            }
        } catch (err) {
            console.error('Cancel download error:', err);
        }

        setShowDownloadProgress(false);
        setCurrentProgressId(null);
    };

    const getFileIcon = (ext: string) => {
        const lowerExt = ext.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif'].includes(lowerExt)) return <Image size={32} className="text-green-500" />;
        if (['mp4', 'mov', 'avi'].includes(lowerExt)) return <Video size={32} className="text-blue-500" />;
        return <File size={32} className="text-gray-500" />;
    };

    
    const getParentVirtualPath = (virtualPath?: string, childName?: string) => {
        if (!virtualPath) return "";
        const cleanPath = virtualPath.replace(/[\\/]+$/, "");
        const cleanChildName = (childName || "").replace(/[\\/]+$/, "");

        if (!cleanChildName) return cleanPath;

        const pathParts = cleanPath.split(/[\\/]/);
        const lastPart = pathParts[pathParts.length - 1];

        if (lastPart?.toLowerCase() !== cleanChildName.toLowerCase()) {
            return cleanPath;
        }

        return pathParts.slice(0, -1).join(cleanPath.includes("\\") ? "\\" : "/");
     };

    const currentVirtualPath =
        getParentVirtualPath(model?.Folder?.[0]?.VirtualPath, model?.Folder?.[0]?.Name) ||
        getParentVirtualPath(model?.Files?.[0]?.VirtualPath, model?.Files?.[0]?.Name);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-red-500">Error: {error}</div>
            </div>
        );
    }

    return ( 
       <>
         <div className="flex justify-end m-3 pb-3 mb-0 pr-16">
                     <h1>
                       
                        <Link href="/" className="flex items-center font-medium hover:text-primary text-dark dark:text-white">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 17.25a.75.75 0 000 1.5h6a.75.75 0 000-1.5H9z"></path>
                        <path  d="M12 1.25c-.725 0-1.387.2-2.11.537-.702.327-1.512.81-2.528 1.415l-1.456.867c-1.119.667-2.01 1.198-2.686 1.706C2.523 6.3 2 6.84 1.66 7.551c-.342.711-.434 1.456-.405 2.325.029.841.176 1.864.36 3.146l.293 2.032c.237 1.65.426 2.959.707 3.978.29 1.05.702 1.885 1.445 2.524.742.64 1.63.925 2.716 1.062 1.056.132 2.387.132 4.066.132h2.316c1.68 0 3.01 0 4.066-.132 1.086-.137 1.974-.422 2.716-1.061.743-.64 1.155-1.474 1.445-2.525.281-1.02.47-2.328.707-3.978l.292-2.032c.185-1.282.332-2.305.36-3.146.03-.87-.062-1.614-.403-2.325C22 6.84 21.477 6.3 20.78 5.775c-.675-.508-1.567-1.039-2.686-1.706l-1.456-.867c-1.016-.605-1.826-1.088-2.527-1.415-.724-.338-1.386-.537-2.111-.537zM8.096 4.511c1.057-.63 1.803-1.073 2.428-1.365.609-.284 1.047-.396 1.476-.396.43 0 .867.112 1.476.396.625.292 1.37.735 2.428 1.365l1.385.825c1.165.694 1.986 1.184 2.59 1.638.587.443.91.809 1.11 1.225.199.416.282.894.257 1.626-.026.75-.16 1.691-.352 3.026l-.28 1.937c-.246 1.714-.422 2.928-.675 3.845-.247.896-.545 1.415-.977 1.787-.433.373-.994.593-1.925.71-.951.119-2.188.12-3.93.12h-2.213c-1.743 0-2.98-.001-3.931-.12-.93-.117-1.492-.337-1.925-.71-.432-.372-.73-.891-.977-1.787-.253-.917-.43-2.131-.676-3.845l-.279-1.937c-.192-1.335-.326-2.277-.352-3.026-.025-.732.058-1.21.258-1.626.2-.416.521-.782 1.11-1.225.603-.454 1.424-.944 2.589-1.638l1.385-.825z"></path>
                        </svg>
                        / </Link>
                      
                        </h1>
                      
                      <h1> <a className="flex items-center gap-2 font-medium hover:text-primary text-dark dark:text-white" href="#">
                      DMS/</a></h1>
                      
                      <h1> <a className="flex items-center gap-2 font-medium hover:text-primary text-dark dark:text-white" href="#">
                      DMS</a></h1>
          </div> 

        <div className="container mx-auto p-6 pt-0">
            <div className="mb-6">
                  {/* backbutton */}
                <div className="flex items-center gap-4 mb-4 border-b-2">
                    {folderId !== "0" && (
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                        >
                            <ArrowLeft size={16} />
                            Back
                        </button>
                    )}

                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 mb-4">
                    {folderId !== "0" && isVirtual !== "1" && (         
                        <>
                            <button
                                onClick={openCreateFolder}
                                className="flex items-center gap-2 px-4 py-2  bg-primary text-white rounded-lg "
                            >
                                <Plus size={16} />
                                Create Folder
                            </button>

                            <button
                                onClick={() => setShowUpload(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                            >
                                <Upload size={16} />
                                Upload File
                            </button>
                        </>
                    )}
                </div>

                <div className="flex gap-2 mb-4">
                    {folderId === "0" && (
                            <>
                            <button
                                onClick={openCreateFolder}
                                className="flex items-center gap-2 px-4 py-2  bg-primary text-white rounded-lg ">
                                <Plus size={16} />
                                Create Folder
                            </button>
                            </>
                         )}
                </div>
     
       {folderId !== "0" && (
    <>
        <h1 className="mb-4 text-sm text-gray-600">
            Path: {currentVirtualPath}
        </h1>
    </>
)}



               {folderId !== "0" && model?.Folder?.length !== 0 && (
    <button
        onClick={downloadAllFiles}
       className="flex items-center gap-2 px-4 py-2  bg-primary text-white rounded-lg "
    >
        Download All Files
    </button>
)}   

                <div className="text-sm text-gray-600">
                    <p>No Folders: {model?.Folder?.length || 0}</p>
                </div>
            </div>


            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
               {items.map((item, index) => (
    <div
      key={`${item.type}-${item.id}-${item.folderData?.VirtualPath || item.fileData?.Path || item.name}-${index}`}
      onClick={() => handleItemClick(item)}
      className="rounded-[10px] bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card p-5 cursor-pointer hover:shadow-lg transition"
    >
      <div className="flex items-center justify-between">
        
        {/* LEFT SIDE */}
        <div className="flex items-center gap-4">
          
          {/* ICON BOX */}
          <div
            className="flex h-15 w-15 items-center justify-center rounded-xl"
            style={{
              backgroundColor:
                item.type === "folder"
                  ? "rgba(63, 217, 127, 0.1)"
                  : "rgba(10, 190, 249, 0.1)",
              color:
                item.type === "folder"
                  ? "rgb(63, 217, 127)"
                  : "rgb(10, 190, 249)",
            }}
          >
            {item.type === "folder" ? (
              <svg width="26" height="26" viewBox="0 0 26 26" fill="currentColor">
                <path d="M17.4085 10.781C18.8488 10.7809 20.076 10.7809 21.0557 10.8917C21.222 10.9105 21.3877 10.9331 21.5522 10.9608C22.1286 11.0575 22.6901 11.216 23.2096 11.49V10.5686C23.2096 9.58395 23.2096 8.76703 23.1172 8.11569C23.0196 7.42829 22.807 6.81897 22.2987 6.31833C22.2158 6.23666 22.1283 6.15915 22.0366 6.08608C21.4821 5.64426 20.8176 5.46357 20.0652 5.37976C19.3403 5.29902 18.4271 5.29903 17.3078 5.29905L16.9257 5.29905C15.8617 5.29905 15.4803 5.29286 15.1348 5.20561C14.9319 5.15436 14.7371 5.08278 14.5543 4.99268C14.2464 4.8409 13.9781 4.61225 13.2245 3.9446L12.7109 3.48956C12.4952 3.29847 12.3481 3.16804 12.1903 3.05219C11.5136 2.55519 10.6896 2.2546 9.82689 2.18312C9.62601 2.16648 9.42102 2.1665 9.11417 2.16652L8.98805 2.16651C8.29399 2.1664 7.83594 2.16632 7.43821 2.2328C5.69963 2.52343 4.29373 3.73888 3.95129 5.34689C3.87338 5.71273 3.87351 6.13188 3.87368 6.73658L3.8737 11.49C4.39317 11.216 4.9547 11.0575 5.53106 10.9608C5.69558 10.9331 5.8613 10.9105 6.0276 10.8917C7.00724 10.7809 8.23449 10.7809 9.67476 10.781H17.4085Z"></path>
                <path d="M3.63774 13.8435C2.9767 14.8634 3.24952 16.2815 3.79516 19.1175C4.18796 21.1592 4.38435 22.18 5.06483 22.8574C5.24139 23.0331 5.43892 23.1889 5.65348 23.3216C6.48044 23.8332 7.57834 23.8332 9.77412 23.8332H17.3092C19.505 23.8332 20.6029 23.8332 21.4299 23.3216C21.6444 23.1889 21.8419 23.0331 22.0185 22.8574C22.699 22.18 22.8954 21.1592 23.2882 19.1175C23.8338 16.2815 24.1066 14.8634 23.4456 13.8435C23.2769 13.5833 23.0689 13.3477 22.8281 13.1443C21.8846 12.3472 20.3594 12.3472 17.3092 12.3472H9.77412C6.7239 12.3472 5.19878 12.3472 4.25525 13.1443C4.01447 13.3477 3.80643 13.5833 3.63774 13.8435Z"></path>
              </svg>
            ) : (
              getFileIcon(item.ext || "")
            )}
          </div>

          {/* NAME */}
          <div>
            <p
              className="text-lg font-medium truncate max-w-[150px]"
              
            >
              {item.name}
            </p>

            <span className="mt-0.5 text-sm text-gray-500">
              {item.type}
            </span>
          </div>
        </div>

        {/* RIGHT SIDE */}
        {/* <div>
          <p className="font-medium text-dark dark:text-white">
            {item.fileData?.Size || "--"}
          </p>
        </div> */}

      </div>
    </div>
  ))}
            </div>



            {/* <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {items.map((item, index) => (
                    <div
                        key={`${item.type}-${item.id}`}
                        onClick={() => handleItemClick(item)}
                        className="flex flex-col items-center p-4  rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                  
                           
                            
                        <div className="mb-2">
                            {item.type === 'folder' ? (
                            
                                <div className="dms-icon-box">
                                  <svg viewBox="0 0 26 26" fill="currentColor">
                                    <path d="M17.4085 10.781C18.8488 10.7809 20.076 10.7809 21.0557 10.8917C21.222 10.9105 21.3877 10.9331 21.5522 10.9608C22.1286 11.0575 22.6901 11.216 23.2096 11.49V10.5686C23.2096 9.58395 23.2096 8.76703 23.1172 8.11569C23.0196 7.42829 22.807 6.81897 22.2987 6.31833C22.2158 6.23666 22.1283 6.15915 22.0366 6.08608C21.4821 5.64426 20.8176 5.46357 20.0652 5.37976C19.3403 5.29902 18.4271 5.29903 17.3078 5.29905L16.9257 5.29905C15.8617 5.29905 15.4803 5.29286 15.1348 5.20561C14.9319 5.15436 14.7371 5.08278 14.5543 4.99268C14.2464 4.8409 13.9781 4.61225 13.2245 3.9446L12.7109 3.48956C12.4952 3.29847 12.3481 3.16804 12.1903 3.05219C11.5136 2.55519 10.6896 2.2546 9.82689 2.18312C9.62601 2.16648 9.42102 2.1665 9.11417 2.16652L8.98805 2.16651C8.29399 2.1664 7.83594 2.16632 7.43821 2.2328C5.69963 2.52343 4.29373 3.73888 3.95129 5.34689C3.87338 5.71273 3.87351 6.13188 3.87368 6.73658L3.8737 11.49C4.39317 11.216 4.9547 11.0575 5.53106 10.9608C5.69558 10.9331 5.8613 10.9105 6.0276 10.8917C7.00724 10.7809 8.23449 10.7809 9.67476 10.781H17.4085Z">
                                    </path>
                                    <path d="M3.63774 13.8435C2.9767 14.8634 3.24952 16.2815 3.79516 19.1175C4.18796 21.1592 4.38435 22.18 5.06483 22.8574C5.24139 23.0331 5.43892 23.1889 5.65348 23.3216C6.48044 23.8332 7.57834 23.8332 9.77412 23.8332H17.3092C19.505 23.8332 20.6029 23.8332 21.4299 23.3216C21.6444 23.1889 21.8419 23.0331 22.0185 22.8574C22.699 22.18 22.8954 21.1592 23.2882 19.1175C23.8338 16.2815 24.1066 14.8634 23.4456 13.8435C23.2769 13.5833 23.0689 13.3477 22.8281 13.1443C21.8846 12.3472 20.3594 12.3472 17.3092 12.3472H9.77412C6.7239 12.3472 5.19878 12.3472 4.25525 13.1443C4.01447 13.3477 3.80643 13.5833 3.63774 13.8435ZM10.5031 18.6123C10.5031 18.1798 10.8741 17.8292 11.3318 17.8292H15.7514C16.2091 17.8292 16.5801 18.1798 16.5801 18.6123C16.5801 19.0448 16.2091 19.3954 15.7514 19.3954H11.3318C10.8741 19.3954 10.5031 19.0448 10.5031 18.6123Z"></path>
                                    </svg>
                                </div>
                                 

                            ) : item.fileData ? (
                                getFileIcon(item.ext || '')
                            ) : (
                                <FileText size={48} className="text-gray-500" />
                            )}
                        </div>
                        <div className="text-center">
                            <div className="font-medium text-sm truncate w-full">{item.name}</div>
                            {item.fileData?.Size && (
                                <div className="text-xs text-gray-500">{item.fileData.Size}</div>
                            )}
                        </div>
                    </div>
                ))}
            </div> */}

            {items.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    No items in this folder
                </div>
            )}

            {/* Create Folder Modal */}
            {showCreateFolder && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-96">
                        <h3 className="text-lg font-bold mb-4">Create Folder</h3>
                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder="Folder Name"
                                value={folderName}
                                onChange={(e) => setFolderName(e.target.value)}
                                className="w-full p-2 border rounded"
                            />
                        </div>
                        <div className="mb-4">
                            <select
                                value={selectedPackage}
                                onChange={(e) => setSelectedPackage(e.target.value)}
                                className="w-full p-2 border rounded"
                                disabled={loadingPackages || packages.length === 0}
                            >
                                {loadingPackages ? (
                                    <option value="">Loading packages...</option>
                                ) : packages.length > 0 ? (
                                    packages.map((pkg, index) => {
                                        const value = pkg.Value ?? pkg.value ?? pkg.Id ?? pkg.id ?? pkg.PackageId ?? pkg.packageId ?? "";
                                        const label = pkg.Text ?? pkg.text ?? pkg.Name ?? pkg.name ?? `Package ${index + 1}`;
                                        return (
                                            <option key={String(value || index)} value={String(value)}>
                                                {label}
                                            </option>
                                        );
                                    })
                                ) : (
                                    <option value="">No packages available</option>
                                )}
                            </select>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowCreateFolder(false)}
                                className="px-4 py-2 bg-gray-500 text-white rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateFolder}
                                className="px-4 py-2  bg-primary text-white rounded"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Modal */}
            {showUpload && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-96">
                        <h3 className="text-lg font-bold mb-4">Upload File</h3>
                        <input
                            type="file"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file);
                            }}
                            className="w-full p-2 border rounded"
                            disabled={uploading}
                        />
                        {uploading && <div className="mt-2 text-sm text-blue-500">Uploading...</div>}
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => setShowUpload(false)}
                                className="px-4 py-2 bg-gray-500 text-white rounded"
                                disabled={uploading}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Gallery Modal */}
            {showGallery && galleryFiles.length > 0 && (
                <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
                    <div className="relative w-full h-full flex items-center justify-center">
                        {/* Close button */}
                        <button
                            onClick={() => setShowGallery(false)}
                            className="absolute top-4 right-4 text-white text-2xl z-10"
                        >
                            &times;
                        </button>
                        
                        {/* Navigation */}
                        <button
                            onClick={() => setGalleryIndex((galleryIndex - 1 + galleryFiles.length) % galleryFiles.length)}
                            className="absolute left-4 text-white text-4xl z-10"
                        >
                            &#8249;
                        </button>
                        <button
                            onClick={() => setGalleryIndex((galleryIndex + 1) % galleryFiles.length)}
                            className="absolute right-4 text-white text-4xl z-10"
                        >
                            &#8250;
                        </button>

                        {/* Content */}
                        <div className="max-w-full max-h-full">
                            {(() => {
                                const file = galleryFiles[galleryIndex];
                                const ext = (file.Extention || '').toLowerCase();
                                if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
                                    return <img src={file.Path} alt={file.Name} className="max-w-full max-h-full object-contain" />;
                                } else if (['mp4', 'mov', 'avi'].includes(ext)) {
                                    return <video src={file.Path} controls className="max-w-full max-h-full" />;
                                }
                                return null;
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Download Progress Modal */}
        {showDownloadProgress && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg w-96">
                    <h3 className="text-lg font-bold mb-4">Downloading Files</h3>
                    <div className="mb-4">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${downloadProgress}%` }}
                            ></div>
                        </div>
                        <div className="text-center mt-2 text-sm text-gray-600">
                            {downloadProgress}%
                        </div>
                    </div>
                    <div className="mb-4 text-sm text-gray-700">
                        {downloadMessage}
                    </div>
                    <div className="flex justify-end">
                        <button
                            onClick={cancelDownload}
                            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                            Cancel Download
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
