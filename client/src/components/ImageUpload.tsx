import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageUploaded: (imageUrl: string) => void;
  className?: string;
}

export default function ImageUpload({ currentImageUrl, onImageUploaded, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('=== IMAGE UPLOAD DEBUG ===');
    console.log('File selected:', file ? `${file.name} (${file.size} bytes)` : 'No file');
    if (!file) {
      console.log('No file selected, returning early');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPEG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    
    try {
      console.log('Getting upload URL from backend...');
      // Get upload URL from backend
      const uploadResponse = await apiRequest("POST", "/api/objects/upload");
      const { uploadURL } = await uploadResponse.json();
      console.log('Got upload URL:', uploadURL);

      console.log('Uploading file to object storage...');
      // Upload file directly to object storage
      const putResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      console.log('Upload response status:', putResponse.status, putResponse.statusText);
      if (!putResponse.ok) {
        throw new Error('Failed to upload file');
      }

      console.log('Setting ACL policy for uploaded image...');
      // Set ACL policy for the uploaded image
      const aclResponse = await apiRequest("PUT", "/api/profile-images", {
        profileImageURL: uploadURL,
      });
      
      const { objectPath } = await aclResponse.json();
      console.log('ACL set successfully, objectPath:', objectPath);
      
      // Call the callback with the object path
      console.log('Calling onImageUploaded with:', objectPath);
      onImageUploaded(objectPath);
      console.log('=== IMAGE UPLOAD COMPLETE ===');
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  const removeImage = () => {
    onImageUploaded('');
    toast({
      title: "Image removed",
      description: "Profile image has been removed",
    });
  };

  return (
    <div className={className}>
      <div className="flex flex-col items-center space-y-4">
        {/* Image Preview */}
        <div className="w-32 h-32 rounded-full overflow-hidden bg-muted border-2 border-border flex items-center justify-center">
          {currentImageUrl ? (
            <img 
              src={currentImageUrl} 
              alt="Profile" 
              className="w-full h-full object-cover"
              data-testid="img-profile-preview"
            />
          ) : (
            <div className="text-muted-foreground" data-testid="placeholder-no-image">
              <i className="fas fa-user text-3xl"></i>
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex flex-col items-center space-y-2">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => document.getElementById('image-upload-input')?.click()}
              data-testid="button-upload-image"
            >
              {uploading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Uploading...
                </>
              ) : (
                <>
                  <i className="fas fa-camera mr-2"></i>
                  {currentImageUrl ? 'Change' : 'Upload'} Photo
                </>
              )}
            </Button>
            
            {currentImageUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={removeImage}
                data-testid="button-remove-image"
              >
                <i className="fas fa-trash mr-2"></i>
                Remove
              </Button>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            JPG, PNG up to 5MB
          </p>
        </div>

        {/* Hidden file input */}
        <Input
          id="image-upload-input"
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
          data-testid="input-file-upload"
        />
      </div>
    </div>
  );
}