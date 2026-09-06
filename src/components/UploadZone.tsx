type UploadZoneProps = {
  onUpload?: (file: File) => void;
};

export default function UploadZone({ onUpload }: UploadZoneProps) {
  return (
    <label>
      Upload study material
      <input
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUpload?.(file);
        }}
      />
    </label>
  );
}
