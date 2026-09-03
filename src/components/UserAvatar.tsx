import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGoogleDriveImage } from "@/hooks/useGoogleDriveImage";

interface UserAvatarProps {
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  tenantId?: string;
  className?: string;
}

/**
 * User avatar that resolves the value stored in `profiles.avatar_url`.\n * That value can be a Google Drive fileId (uploaded via AvatarUploader),\n * so it is resolved through the Core proxy before rendering.\n * Falls back to the user's initials when there is no image.
 */
export function UserAvatar({
  avatarUrl,
  firstName,
  lastName,
  tenantId,
  className,
}: UserAvatarProps) {
  const { displayUrl } = useGoogleDriveImage(avatarUrl || undefined, tenantId);

  const first = firstName?.charAt(0)?.toUpperCase() || "";
  const last = lastName?.charAt(0)?.toUpperCase() || "";
  const initials = first + last || "U";

  return (
    <Avatar className={className}>
      <AvatarImage src={displayUrl || undefined} />
      <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
    </Avatar>
  );
}