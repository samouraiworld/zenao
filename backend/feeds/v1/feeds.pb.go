// Code generated by protoc-gen-go. DO NOT EDIT.
// versions:
// 	protoc-gen-go v1.36.4
// 	protoc        (unknown)
// source: feeds/v1/feeds.proto

package feedsv1

import (
	protoreflect "google.golang.org/protobuf/reflect/protoreflect"
	protoimpl "google.golang.org/protobuf/runtime/protoimpl"
	reflect "reflect"
	sync "sync"
	unsafe "unsafe"
)

const (
	// Verify that this generated code is sufficiently up-to-date.
	_ = protoimpl.EnforceVersion(20 - protoimpl.MinVersion)
	// Verify that runtime/protoimpl is sufficiently up-to-date.
	_ = protoimpl.EnforceVersion(protoimpl.MaxVersion - 20)
)

type PostGeoLoc struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Lat           float32                `protobuf:"fixed32,2,opt,name=lat,proto3" json:"lat,omitempty"`
	Lng           float32                `protobuf:"fixed32,3,opt,name=lng,proto3" json:"lng,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *PostGeoLoc) Reset() {
	*x = PostGeoLoc{}
	mi := &file_feeds_v1_feeds_proto_msgTypes[0]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *PostGeoLoc) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*PostGeoLoc) ProtoMessage() {}

func (x *PostGeoLoc) ProtoReflect() protoreflect.Message {
	mi := &file_feeds_v1_feeds_proto_msgTypes[0]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use PostGeoLoc.ProtoReflect.Descriptor instead.
func (*PostGeoLoc) Descriptor() ([]byte, []int) {
	return file_feeds_v1_feeds_proto_rawDescGZIP(), []int{0}
}

func (x *PostGeoLoc) GetLat() float32 {
	if x != nil {
		return x.Lat
	}
	return 0
}

func (x *PostGeoLoc) GetLng() float32 {
	if x != nil {
		return x.Lng
	}
	return 0
}

type StandardPost struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Content       string                 `protobuf:"bytes,1,opt,name=content,proto3" json:"content,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *StandardPost) Reset() {
	*x = StandardPost{}
	mi := &file_feeds_v1_feeds_proto_msgTypes[1]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *StandardPost) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*StandardPost) ProtoMessage() {}

func (x *StandardPost) ProtoReflect() protoreflect.Message {
	mi := &file_feeds_v1_feeds_proto_msgTypes[1]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use StandardPost.ProtoReflect.Descriptor instead.
func (*StandardPost) Descriptor() ([]byte, []int) {
	return file_feeds_v1_feeds_proto_rawDescGZIP(), []int{1}
}

func (x *StandardPost) GetContent() string {
	if x != nil {
		return x.Content
	}
	return ""
}

type ArticlePost struct {
	state           protoimpl.MessageState `protogen:"open.v1"`
	Title           string                 `protobuf:"bytes,1,opt,name=title,proto3" json:"title,omitempty"`
	PreviewText     string                 `protobuf:"bytes,2,opt,name=preview_text,json=previewText,proto3" json:"preview_text,omitempty"`
	PreviewImageUri string                 `protobuf:"bytes,3,opt,name=preview_image_uri,json=previewImageUri,proto3" json:"preview_image_uri,omitempty"`
	Content         string                 `protobuf:"bytes,4,opt,name=content,proto3" json:"content,omitempty"`
	unknownFields   protoimpl.UnknownFields
	sizeCache       protoimpl.SizeCache
}

func (x *ArticlePost) Reset() {
	*x = ArticlePost{}
	mi := &file_feeds_v1_feeds_proto_msgTypes[2]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *ArticlePost) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*ArticlePost) ProtoMessage() {}

func (x *ArticlePost) ProtoReflect() protoreflect.Message {
	mi := &file_feeds_v1_feeds_proto_msgTypes[2]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use ArticlePost.ProtoReflect.Descriptor instead.
func (*ArticlePost) Descriptor() ([]byte, []int) {
	return file_feeds_v1_feeds_proto_rawDescGZIP(), []int{2}
}

func (x *ArticlePost) GetTitle() string {
	if x != nil {
		return x.Title
	}
	return ""
}

func (x *ArticlePost) GetPreviewText() string {
	if x != nil {
		return x.PreviewText
	}
	return ""
}

func (x *ArticlePost) GetPreviewImageUri() string {
	if x != nil {
		return x.PreviewImageUri
	}
	return ""
}

func (x *ArticlePost) GetContent() string {
	if x != nil {
		return x.Content
	}
	return ""
}

type LinkPost struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Uri           string                 `protobuf:"bytes,1,opt,name=uri,proto3" json:"uri,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *LinkPost) Reset() {
	*x = LinkPost{}
	mi := &file_feeds_v1_feeds_proto_msgTypes[3]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *LinkPost) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*LinkPost) ProtoMessage() {}

func (x *LinkPost) ProtoReflect() protoreflect.Message {
	mi := &file_feeds_v1_feeds_proto_msgTypes[3]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use LinkPost.ProtoReflect.Descriptor instead.
func (*LinkPost) Descriptor() ([]byte, []int) {
	return file_feeds_v1_feeds_proto_rawDescGZIP(), []int{3}
}

func (x *LinkPost) GetUri() string {
	if x != nil {
		return x.Uri
	}
	return ""
}

type ImagePost struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Title         string                 `protobuf:"bytes,1,opt,name=title,proto3" json:"title,omitempty"`
	Description   string                 `protobuf:"bytes,2,opt,name=description,proto3" json:"description,omitempty"`
	ImageUri      string                 `protobuf:"bytes,3,opt,name=image_uri,json=imageUri,proto3" json:"image_uri,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *ImagePost) Reset() {
	*x = ImagePost{}
	mi := &file_feeds_v1_feeds_proto_msgTypes[4]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *ImagePost) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*ImagePost) ProtoMessage() {}

func (x *ImagePost) ProtoReflect() protoreflect.Message {
	mi := &file_feeds_v1_feeds_proto_msgTypes[4]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use ImagePost.ProtoReflect.Descriptor instead.
func (*ImagePost) Descriptor() ([]byte, []int) {
	return file_feeds_v1_feeds_proto_rawDescGZIP(), []int{4}
}

func (x *ImagePost) GetTitle() string {
	if x != nil {
		return x.Title
	}
	return ""
}

func (x *ImagePost) GetDescription() string {
	if x != nil {
		return x.Description
	}
	return ""
}

func (x *ImagePost) GetImageUri() string {
	if x != nil {
		return x.ImageUri
	}
	return ""
}

type AudioPost struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Title         string                 `protobuf:"bytes,1,opt,name=title,proto3" json:"title,omitempty"`
	Description   string                 `protobuf:"bytes,2,opt,name=description,proto3" json:"description,omitempty"`
	AudioUri      string                 `protobuf:"bytes,3,opt,name=audio_uri,json=audioUri,proto3" json:"audio_uri,omitempty"`
	ImageUri      string                 `protobuf:"bytes,4,opt,name=image_uri,json=imageUri,proto3" json:"image_uri,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *AudioPost) Reset() {
	*x = AudioPost{}
	mi := &file_feeds_v1_feeds_proto_msgTypes[5]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *AudioPost) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*AudioPost) ProtoMessage() {}

func (x *AudioPost) ProtoReflect() protoreflect.Message {
	mi := &file_feeds_v1_feeds_proto_msgTypes[5]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use AudioPost.ProtoReflect.Descriptor instead.
func (*AudioPost) Descriptor() ([]byte, []int) {
	return file_feeds_v1_feeds_proto_rawDescGZIP(), []int{5}
}

func (x *AudioPost) GetTitle() string {
	if x != nil {
		return x.Title
	}
	return ""
}

func (x *AudioPost) GetDescription() string {
	if x != nil {
		return x.Description
	}
	return ""
}

func (x *AudioPost) GetAudioUri() string {
	if x != nil {
		return x.AudioUri
	}
	return ""
}

func (x *AudioPost) GetImageUri() string {
	if x != nil {
		return x.ImageUri
	}
	return ""
}

type VideoPost struct {
	state             protoimpl.MessageState `protogen:"open.v1"`
	Title             string                 `protobuf:"bytes,1,opt,name=title,proto3" json:"title,omitempty"`
	Description       string                 `protobuf:"bytes,2,opt,name=description,proto3" json:"description,omitempty"`
	VideoUri          string                 `protobuf:"bytes,3,opt,name=video_uri,json=videoUri,proto3" json:"video_uri,omitempty"`
	ThumbnailImageUri string                 `protobuf:"bytes,4,opt,name=thumbnail_image_uri,json=thumbnailImageUri,proto3" json:"thumbnail_image_uri,omitempty"`
	unknownFields     protoimpl.UnknownFields
	sizeCache         protoimpl.SizeCache
}

func (x *VideoPost) Reset() {
	*x = VideoPost{}
	mi := &file_feeds_v1_feeds_proto_msgTypes[6]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *VideoPost) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*VideoPost) ProtoMessage() {}

func (x *VideoPost) ProtoReflect() protoreflect.Message {
	mi := &file_feeds_v1_feeds_proto_msgTypes[6]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use VideoPost.ProtoReflect.Descriptor instead.
func (*VideoPost) Descriptor() ([]byte, []int) {
	return file_feeds_v1_feeds_proto_rawDescGZIP(), []int{6}
}

func (x *VideoPost) GetTitle() string {
	if x != nil {
		return x.Title
	}
	return ""
}

func (x *VideoPost) GetDescription() string {
	if x != nil {
		return x.Description
	}
	return ""
}

func (x *VideoPost) GetVideoUri() string {
	if x != nil {
		return x.VideoUri
	}
	return ""
}

func (x *VideoPost) GetThumbnailImageUri() string {
	if x != nil {
		return x.ThumbnailImageUri
	}
	return ""
}

// XXX: not used yet in contracts
type Reaction struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	PostUri       string                 `protobuf:"bytes,1,opt,name=post_uri,json=postUri,proto3" json:"post_uri,omitempty"`
	Icon          string                 `protobuf:"bytes,2,opt,name=icon,proto3" json:"icon,omitempty"`
	UserId        string                 `protobuf:"bytes,3,opt,name=user_id,json=userId,proto3" json:"user_id,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *Reaction) Reset() {
	*x = Reaction{}
	mi := &file_feeds_v1_feeds_proto_msgTypes[7]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *Reaction) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*Reaction) ProtoMessage() {}

func (x *Reaction) ProtoReflect() protoreflect.Message {
	mi := &file_feeds_v1_feeds_proto_msgTypes[7]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use Reaction.ProtoReflect.Descriptor instead.
func (*Reaction) Descriptor() ([]byte, []int) {
	return file_feeds_v1_feeds_proto_rawDescGZIP(), []int{7}
}

func (x *Reaction) GetPostUri() string {
	if x != nil {
		return x.PostUri
	}
	return ""
}

func (x *Reaction) GetIcon() string {
	if x != nil {
		return x.Icon
	}
	return ""
}

func (x *Reaction) GetUserId() string {
	if x != nil {
		return x.UserId
	}
	return ""
}

// Only on local chaine from the related post
type Tip struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	PostLocalId   string                 `protobuf:"bytes,1,opt,name=post_local_id,json=postLocalId,proto3" json:"post_local_id,omitempty"`
	Denom         string                 `protobuf:"bytes,3,opt,name=denom,proto3" json:"denom,omitempty"`
	Amount        int64                  `protobuf:"varint,4,opt,name=amount,proto3" json:"amount,omitempty"` // XXX: use string encoding?
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *Tip) Reset() {
	*x = Tip{}
	mi := &file_feeds_v1_feeds_proto_msgTypes[8]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *Tip) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*Tip) ProtoMessage() {}

func (x *Tip) ProtoReflect() protoreflect.Message {
	mi := &file_feeds_v1_feeds_proto_msgTypes[8]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use Tip.ProtoReflect.Descriptor instead.
func (*Tip) Descriptor() ([]byte, []int) {
	return file_feeds_v1_feeds_proto_rawDescGZIP(), []int{8}
}

func (x *Tip) GetPostLocalId() string {
	if x != nil {
		return x.PostLocalId
	}
	return ""
}

func (x *Tip) GetDenom() string {
	if x != nil {
		return x.Denom
	}
	return ""
}

func (x *Tip) GetAmount() int64 {
	if x != nil {
		return x.Amount
	}
	return 0
}

type Post struct {
	state       protoimpl.MessageState `protogen:"open.v1"`
	LocalPostId uint64                 `protobuf:"varint,1,opt,name=local_post_id,json=localPostId,proto3" json:"local_post_id,omitempty"`
	Author      string                 `protobuf:"bytes,2,opt,name=author,proto3" json:"author,omitempty"`
	ParentUri   string                 `protobuf:"bytes,3,opt,name=parent_uri,json=parentUri,proto3" json:"parent_uri,omitempty"`
	Loc         *PostGeoLoc            `protobuf:"bytes,4,opt,name=loc,proto3" json:"loc,omitempty"` // XXX: map any extentions = 10;
	CreatedAt   int64                  `protobuf:"varint,5,opt,name=created_at,json=createdAt,proto3" json:"created_at,omitempty"`
	UpdatedAt   int64                  `protobuf:"varint,6,opt,name=updated_at,json=updatedAt,proto3" json:"updated_at,omitempty"`
	DeletedAt   int64                  `protobuf:"varint,7,opt,name=deleted_at,json=deletedAt,proto3" json:"deleted_at,omitempty"` // if != 0 -> deleted
	Tags        []string               `protobuf:"bytes,8,rep,name=tags,proto3" json:"tags,omitempty"`
	// Types that are valid to be assigned to Post:
	//
	//	*Post_Standard
	//	*Post_Article
	//	*Post_Link
	//	*Post_Image
	//	*Post_Video
	//	*Post_Audio
	Post          isPost_Post `protobuf_oneof:"post"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *Post) Reset() {
	*x = Post{}
	mi := &file_feeds_v1_feeds_proto_msgTypes[9]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *Post) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*Post) ProtoMessage() {}

func (x *Post) ProtoReflect() protoreflect.Message {
	mi := &file_feeds_v1_feeds_proto_msgTypes[9]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use Post.ProtoReflect.Descriptor instead.
func (*Post) Descriptor() ([]byte, []int) {
	return file_feeds_v1_feeds_proto_rawDescGZIP(), []int{9}
}

func (x *Post) GetLocalPostId() uint64 {
	if x != nil {
		return x.LocalPostId
	}
	return 0
}

func (x *Post) GetAuthor() string {
	if x != nil {
		return x.Author
	}
	return ""
}

func (x *Post) GetParentUri() string {
	if x != nil {
		return x.ParentUri
	}
	return ""
}

func (x *Post) GetLoc() *PostGeoLoc {
	if x != nil {
		return x.Loc
	}
	return nil
}

func (x *Post) GetCreatedAt() int64 {
	if x != nil {
		return x.CreatedAt
	}
	return 0
}

func (x *Post) GetUpdatedAt() int64 {
	if x != nil {
		return x.UpdatedAt
	}
	return 0
}

func (x *Post) GetDeletedAt() int64 {
	if x != nil {
		return x.DeletedAt
	}
	return 0
}

func (x *Post) GetTags() []string {
	if x != nil {
		return x.Tags
	}
	return nil
}

func (x *Post) GetPost() isPost_Post {
	if x != nil {
		return x.Post
	}
	return nil
}

func (x *Post) GetStandard() *StandardPost {
	if x != nil {
		if x, ok := x.Post.(*Post_Standard); ok {
			return x.Standard
		}
	}
	return nil
}

func (x *Post) GetArticle() *ArticlePost {
	if x != nil {
		if x, ok := x.Post.(*Post_Article); ok {
			return x.Article
		}
	}
	return nil
}

func (x *Post) GetLink() *LinkPost {
	if x != nil {
		if x, ok := x.Post.(*Post_Link); ok {
			return x.Link
		}
	}
	return nil
}

func (x *Post) GetImage() *ImagePost {
	if x != nil {
		if x, ok := x.Post.(*Post_Image); ok {
			return x.Image
		}
	}
	return nil
}

func (x *Post) GetVideo() *VideoPost {
	if x != nil {
		if x, ok := x.Post.(*Post_Video); ok {
			return x.Video
		}
	}
	return nil
}

func (x *Post) GetAudio() *AudioPost {
	if x != nil {
		if x, ok := x.Post.(*Post_Audio); ok {
			return x.Audio
		}
	}
	return nil
}

type isPost_Post interface {
	isPost_Post()
}

type Post_Standard struct {
	Standard *StandardPost `protobuf:"bytes,9,opt,name=standard,proto3,oneof"`
}

type Post_Article struct {
	Article *ArticlePost `protobuf:"bytes,10,opt,name=article,proto3,oneof"`
}

type Post_Link struct {
	Link *LinkPost `protobuf:"bytes,11,opt,name=link,proto3,oneof"`
}

type Post_Image struct {
	Image *ImagePost `protobuf:"bytes,12,opt,name=image,proto3,oneof"`
}

type Post_Video struct {
	Video *VideoPost `protobuf:"bytes,13,opt,name=video,proto3,oneof"`
}

type Post_Audio struct {
	Audio *AudioPost `protobuf:"bytes,14,opt,name=audio,proto3,oneof"`
}

func (*Post_Standard) isPost_Post() {}

func (*Post_Article) isPost_Post() {}

func (*Post_Link) isPost_Post() {}

func (*Post_Image) isPost_Post() {}

func (*Post_Video) isPost_Post() {}

func (*Post_Audio) isPost_Post() {}

type PostView struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Post          *Post                  `protobuf:"bytes,1,opt,name=post,proto3" json:"post,omitempty"`
	ChildrenCount uint64                 `protobuf:"varint,2,opt,name=children_count,json=childrenCount,proto3" json:"children_count,omitempty"`
	Reactions     []*ReactionView        `protobuf:"bytes,3,rep,name=reactions,proto3" json:"reactions,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *PostView) Reset() {
	*x = PostView{}
	mi := &file_feeds_v1_feeds_proto_msgTypes[10]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *PostView) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*PostView) ProtoMessage() {}

func (x *PostView) ProtoReflect() protoreflect.Message {
	mi := &file_feeds_v1_feeds_proto_msgTypes[10]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use PostView.ProtoReflect.Descriptor instead.
func (*PostView) Descriptor() ([]byte, []int) {
	return file_feeds_v1_feeds_proto_rawDescGZIP(), []int{10}
}

func (x *PostView) GetPost() *Post {
	if x != nil {
		return x.Post
	}
	return nil
}

func (x *PostView) GetChildrenCount() uint64 {
	if x != nil {
		return x.ChildrenCount
	}
	return 0
}

func (x *PostView) GetReactions() []*ReactionView {
	if x != nil {
		return x.Reactions
	}
	return nil
}

type ReactionView struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Icon          string                 `protobuf:"bytes,1,opt,name=icon,proto3" json:"icon,omitempty"`
	Count         uint32                 `protobuf:"varint,2,opt,name=count,proto3" json:"count,omitempty"`
	UserHasVoted  bool                   `protobuf:"varint,3,opt,name=user_has_voted,json=userHasVoted,proto3" json:"user_has_voted,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *ReactionView) Reset() {
	*x = ReactionView{}
	mi := &file_feeds_v1_feeds_proto_msgTypes[11]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *ReactionView) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*ReactionView) ProtoMessage() {}

func (x *ReactionView) ProtoReflect() protoreflect.Message {
	mi := &file_feeds_v1_feeds_proto_msgTypes[11]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use ReactionView.ProtoReflect.Descriptor instead.
func (*ReactionView) Descriptor() ([]byte, []int) {
	return file_feeds_v1_feeds_proto_rawDescGZIP(), []int{11}
}

func (x *ReactionView) GetIcon() string {
	if x != nil {
		return x.Icon
	}
	return ""
}

func (x *ReactionView) GetCount() uint32 {
	if x != nil {
		return x.Count
	}
	return 0
}

func (x *ReactionView) GetUserHasVoted() bool {
	if x != nil {
		return x.UserHasVoted
	}
	return false
}

var File_feeds_v1_feeds_proto protoreflect.FileDescriptor

var file_feeds_v1_feeds_proto_rawDesc = string([]byte{
	0x0a, 0x14, 0x66, 0x65, 0x65, 0x64, 0x73, 0x2f, 0x76, 0x31, 0x2f, 0x66, 0x65, 0x65, 0x64, 0x73,
	0x2e, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x12, 0x08, 0x66, 0x65, 0x65, 0x64, 0x73, 0x2e, 0x76, 0x31,
	0x22, 0x30, 0x0a, 0x0a, 0x50, 0x6f, 0x73, 0x74, 0x47, 0x65, 0x6f, 0x4c, 0x6f, 0x63, 0x12, 0x10,
	0x0a, 0x03, 0x6c, 0x61, 0x74, 0x18, 0x02, 0x20, 0x01, 0x28, 0x02, 0x52, 0x03, 0x6c, 0x61, 0x74,
	0x12, 0x10, 0x0a, 0x03, 0x6c, 0x6e, 0x67, 0x18, 0x03, 0x20, 0x01, 0x28, 0x02, 0x52, 0x03, 0x6c,
	0x6e, 0x67, 0x22, 0x28, 0x0a, 0x0c, 0x53, 0x74, 0x61, 0x6e, 0x64, 0x61, 0x72, 0x64, 0x50, 0x6f,
	0x73, 0x74, 0x12, 0x18, 0x0a, 0x07, 0x63, 0x6f, 0x6e, 0x74, 0x65, 0x6e, 0x74, 0x18, 0x01, 0x20,
	0x01, 0x28, 0x09, 0x52, 0x07, 0x63, 0x6f, 0x6e, 0x74, 0x65, 0x6e, 0x74, 0x22, 0x8c, 0x01, 0x0a,
	0x0b, 0x41, 0x72, 0x74, 0x69, 0x63, 0x6c, 0x65, 0x50, 0x6f, 0x73, 0x74, 0x12, 0x14, 0x0a, 0x05,
	0x74, 0x69, 0x74, 0x6c, 0x65, 0x18, 0x01, 0x20, 0x01, 0x28, 0x09, 0x52, 0x05, 0x74, 0x69, 0x74,
	0x6c, 0x65, 0x12, 0x21, 0x0a, 0x0c, 0x70, 0x72, 0x65, 0x76, 0x69, 0x65, 0x77, 0x5f, 0x74, 0x65,
	0x78, 0x74, 0x18, 0x02, 0x20, 0x01, 0x28, 0x09, 0x52, 0x0b, 0x70, 0x72, 0x65, 0x76, 0x69, 0x65,
	0x77, 0x54, 0x65, 0x78, 0x74, 0x12, 0x2a, 0x0a, 0x11, 0x70, 0x72, 0x65, 0x76, 0x69, 0x65, 0x77,
	0x5f, 0x69, 0x6d, 0x61, 0x67, 0x65, 0x5f, 0x75, 0x72, 0x69, 0x18, 0x03, 0x20, 0x01, 0x28, 0x09,
	0x52, 0x0f, 0x70, 0x72, 0x65, 0x76, 0x69, 0x65, 0x77, 0x49, 0x6d, 0x61, 0x67, 0x65, 0x55, 0x72,
	0x69, 0x12, 0x18, 0x0a, 0x07, 0x63, 0x6f, 0x6e, 0x74, 0x65, 0x6e, 0x74, 0x18, 0x04, 0x20, 0x01,
	0x28, 0x09, 0x52, 0x07, 0x63, 0x6f, 0x6e, 0x74, 0x65, 0x6e, 0x74, 0x22, 0x1c, 0x0a, 0x08, 0x4c,
	0x69, 0x6e, 0x6b, 0x50, 0x6f, 0x73, 0x74, 0x12, 0x10, 0x0a, 0x03, 0x75, 0x72, 0x69, 0x18, 0x01,
	0x20, 0x01, 0x28, 0x09, 0x52, 0x03, 0x75, 0x72, 0x69, 0x22, 0x60, 0x0a, 0x09, 0x49, 0x6d, 0x61,
	0x67, 0x65, 0x50, 0x6f, 0x73, 0x74, 0x12, 0x14, 0x0a, 0x05, 0x74, 0x69, 0x74, 0x6c, 0x65, 0x18,
	0x01, 0x20, 0x01, 0x28, 0x09, 0x52, 0x05, 0x74, 0x69, 0x74, 0x6c, 0x65, 0x12, 0x20, 0x0a, 0x0b,
	0x64, 0x65, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x69, 0x6f, 0x6e, 0x18, 0x02, 0x20, 0x01, 0x28,
	0x09, 0x52, 0x0b, 0x64, 0x65, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x69, 0x6f, 0x6e, 0x12, 0x1b,
	0x0a, 0x09, 0x69, 0x6d, 0x61, 0x67, 0x65, 0x5f, 0x75, 0x72, 0x69, 0x18, 0x03, 0x20, 0x01, 0x28,
	0x09, 0x52, 0x08, 0x69, 0x6d, 0x61, 0x67, 0x65, 0x55, 0x72, 0x69, 0x22, 0x7d, 0x0a, 0x09, 0x41,
	0x75, 0x64, 0x69, 0x6f, 0x50, 0x6f, 0x73, 0x74, 0x12, 0x14, 0x0a, 0x05, 0x74, 0x69, 0x74, 0x6c,
	0x65, 0x18, 0x01, 0x20, 0x01, 0x28, 0x09, 0x52, 0x05, 0x74, 0x69, 0x74, 0x6c, 0x65, 0x12, 0x20,
	0x0a, 0x0b, 0x64, 0x65, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x69, 0x6f, 0x6e, 0x18, 0x02, 0x20,
	0x01, 0x28, 0x09, 0x52, 0x0b, 0x64, 0x65, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x69, 0x6f, 0x6e,
	0x12, 0x1b, 0x0a, 0x09, 0x61, 0x75, 0x64, 0x69, 0x6f, 0x5f, 0x75, 0x72, 0x69, 0x18, 0x03, 0x20,
	0x01, 0x28, 0x09, 0x52, 0x08, 0x61, 0x75, 0x64, 0x69, 0x6f, 0x55, 0x72, 0x69, 0x12, 0x1b, 0x0a,
	0x09, 0x69, 0x6d, 0x61, 0x67, 0x65, 0x5f, 0x75, 0x72, 0x69, 0x18, 0x04, 0x20, 0x01, 0x28, 0x09,
	0x52, 0x08, 0x69, 0x6d, 0x61, 0x67, 0x65, 0x55, 0x72, 0x69, 0x22, 0x90, 0x01, 0x0a, 0x09, 0x56,
	0x69, 0x64, 0x65, 0x6f, 0x50, 0x6f, 0x73, 0x74, 0x12, 0x14, 0x0a, 0x05, 0x74, 0x69, 0x74, 0x6c,
	0x65, 0x18, 0x01, 0x20, 0x01, 0x28, 0x09, 0x52, 0x05, 0x74, 0x69, 0x74, 0x6c, 0x65, 0x12, 0x20,
	0x0a, 0x0b, 0x64, 0x65, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x69, 0x6f, 0x6e, 0x18, 0x02, 0x20,
	0x01, 0x28, 0x09, 0x52, 0x0b, 0x64, 0x65, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x69, 0x6f, 0x6e,
	0x12, 0x1b, 0x0a, 0x09, 0x76, 0x69, 0x64, 0x65, 0x6f, 0x5f, 0x75, 0x72, 0x69, 0x18, 0x03, 0x20,
	0x01, 0x28, 0x09, 0x52, 0x08, 0x76, 0x69, 0x64, 0x65, 0x6f, 0x55, 0x72, 0x69, 0x12, 0x2e, 0x0a,
	0x13, 0x74, 0x68, 0x75, 0x6d, 0x62, 0x6e, 0x61, 0x69, 0x6c, 0x5f, 0x69, 0x6d, 0x61, 0x67, 0x65,
	0x5f, 0x75, 0x72, 0x69, 0x18, 0x04, 0x20, 0x01, 0x28, 0x09, 0x52, 0x11, 0x74, 0x68, 0x75, 0x6d,
	0x62, 0x6e, 0x61, 0x69, 0x6c, 0x49, 0x6d, 0x61, 0x67, 0x65, 0x55, 0x72, 0x69, 0x22, 0x52, 0x0a,
	0x08, 0x52, 0x65, 0x61, 0x63, 0x74, 0x69, 0x6f, 0x6e, 0x12, 0x19, 0x0a, 0x08, 0x70, 0x6f, 0x73,
	0x74, 0x5f, 0x75, 0x72, 0x69, 0x18, 0x01, 0x20, 0x01, 0x28, 0x09, 0x52, 0x07, 0x70, 0x6f, 0x73,
	0x74, 0x55, 0x72, 0x69, 0x12, 0x12, 0x0a, 0x04, 0x69, 0x63, 0x6f, 0x6e, 0x18, 0x02, 0x20, 0x01,
	0x28, 0x09, 0x52, 0x04, 0x69, 0x63, 0x6f, 0x6e, 0x12, 0x17, 0x0a, 0x07, 0x75, 0x73, 0x65, 0x72,
	0x5f, 0x69, 0x64, 0x18, 0x03, 0x20, 0x01, 0x28, 0x09, 0x52, 0x06, 0x75, 0x73, 0x65, 0x72, 0x49,
	0x64, 0x22, 0x57, 0x0a, 0x03, 0x54, 0x69, 0x70, 0x12, 0x22, 0x0a, 0x0d, 0x70, 0x6f, 0x73, 0x74,
	0x5f, 0x6c, 0x6f, 0x63, 0x61, 0x6c, 0x5f, 0x69, 0x64, 0x18, 0x01, 0x20, 0x01, 0x28, 0x09, 0x52,
	0x0b, 0x70, 0x6f, 0x73, 0x74, 0x4c, 0x6f, 0x63, 0x61, 0x6c, 0x49, 0x64, 0x12, 0x14, 0x0a, 0x05,
	0x64, 0x65, 0x6e, 0x6f, 0x6d, 0x18, 0x03, 0x20, 0x01, 0x28, 0x09, 0x52, 0x05, 0x64, 0x65, 0x6e,
	0x6f, 0x6d, 0x12, 0x16, 0x0a, 0x06, 0x61, 0x6d, 0x6f, 0x75, 0x6e, 0x74, 0x18, 0x04, 0x20, 0x01,
	0x28, 0x03, 0x52, 0x06, 0x61, 0x6d, 0x6f, 0x75, 0x6e, 0x74, 0x22, 0x9c, 0x04, 0x0a, 0x04, 0x50,
	0x6f, 0x73, 0x74, 0x12, 0x22, 0x0a, 0x0d, 0x6c, 0x6f, 0x63, 0x61, 0x6c, 0x5f, 0x70, 0x6f, 0x73,
	0x74, 0x5f, 0x69, 0x64, 0x18, 0x01, 0x20, 0x01, 0x28, 0x04, 0x52, 0x0b, 0x6c, 0x6f, 0x63, 0x61,
	0x6c, 0x50, 0x6f, 0x73, 0x74, 0x49, 0x64, 0x12, 0x16, 0x0a, 0x06, 0x61, 0x75, 0x74, 0x68, 0x6f,
	0x72, 0x18, 0x02, 0x20, 0x01, 0x28, 0x09, 0x52, 0x06, 0x61, 0x75, 0x74, 0x68, 0x6f, 0x72, 0x12,
	0x1d, 0x0a, 0x0a, 0x70, 0x61, 0x72, 0x65, 0x6e, 0x74, 0x5f, 0x75, 0x72, 0x69, 0x18, 0x03, 0x20,
	0x01, 0x28, 0x09, 0x52, 0x09, 0x70, 0x61, 0x72, 0x65, 0x6e, 0x74, 0x55, 0x72, 0x69, 0x12, 0x26,
	0x0a, 0x03, 0x6c, 0x6f, 0x63, 0x18, 0x04, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x14, 0x2e, 0x66, 0x65,
	0x65, 0x64, 0x73, 0x2e, 0x76, 0x31, 0x2e, 0x50, 0x6f, 0x73, 0x74, 0x47, 0x65, 0x6f, 0x4c, 0x6f,
	0x63, 0x52, 0x03, 0x6c, 0x6f, 0x63, 0x12, 0x1d, 0x0a, 0x0a, 0x63, 0x72, 0x65, 0x61, 0x74, 0x65,
	0x64, 0x5f, 0x61, 0x74, 0x18, 0x05, 0x20, 0x01, 0x28, 0x03, 0x52, 0x09, 0x63, 0x72, 0x65, 0x61,
	0x74, 0x65, 0x64, 0x41, 0x74, 0x12, 0x1d, 0x0a, 0x0a, 0x75, 0x70, 0x64, 0x61, 0x74, 0x65, 0x64,
	0x5f, 0x61, 0x74, 0x18, 0x06, 0x20, 0x01, 0x28, 0x03, 0x52, 0x09, 0x75, 0x70, 0x64, 0x61, 0x74,
	0x65, 0x64, 0x41, 0x74, 0x12, 0x1d, 0x0a, 0x0a, 0x64, 0x65, 0x6c, 0x65, 0x74, 0x65, 0x64, 0x5f,
	0x61, 0x74, 0x18, 0x07, 0x20, 0x01, 0x28, 0x03, 0x52, 0x09, 0x64, 0x65, 0x6c, 0x65, 0x74, 0x65,
	0x64, 0x41, 0x74, 0x12, 0x12, 0x0a, 0x04, 0x74, 0x61, 0x67, 0x73, 0x18, 0x08, 0x20, 0x03, 0x28,
	0x09, 0x52, 0x04, 0x74, 0x61, 0x67, 0x73, 0x12, 0x34, 0x0a, 0x08, 0x73, 0x74, 0x61, 0x6e, 0x64,
	0x61, 0x72, 0x64, 0x18, 0x09, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x16, 0x2e, 0x66, 0x65, 0x65, 0x64,
	0x73, 0x2e, 0x76, 0x31, 0x2e, 0x53, 0x74, 0x61, 0x6e, 0x64, 0x61, 0x72, 0x64, 0x50, 0x6f, 0x73,
	0x74, 0x48, 0x00, 0x52, 0x08, 0x73, 0x74, 0x61, 0x6e, 0x64, 0x61, 0x72, 0x64, 0x12, 0x31, 0x0a,
	0x07, 0x61, 0x72, 0x74, 0x69, 0x63, 0x6c, 0x65, 0x18, 0x0a, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x15,
	0x2e, 0x66, 0x65, 0x65, 0x64, 0x73, 0x2e, 0x76, 0x31, 0x2e, 0x41, 0x72, 0x74, 0x69, 0x63, 0x6c,
	0x65, 0x50, 0x6f, 0x73, 0x74, 0x48, 0x00, 0x52, 0x07, 0x61, 0x72, 0x74, 0x69, 0x63, 0x6c, 0x65,
	0x12, 0x28, 0x0a, 0x04, 0x6c, 0x69, 0x6e, 0x6b, 0x18, 0x0b, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x12,
	0x2e, 0x66, 0x65, 0x65, 0x64, 0x73, 0x2e, 0x76, 0x31, 0x2e, 0x4c, 0x69, 0x6e, 0x6b, 0x50, 0x6f,
	0x73, 0x74, 0x48, 0x00, 0x52, 0x04, 0x6c, 0x69, 0x6e, 0x6b, 0x12, 0x2b, 0x0a, 0x05, 0x69, 0x6d,
	0x61, 0x67, 0x65, 0x18, 0x0c, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x13, 0x2e, 0x66, 0x65, 0x65, 0x64,
	0x73, 0x2e, 0x76, 0x31, 0x2e, 0x49, 0x6d, 0x61, 0x67, 0x65, 0x50, 0x6f, 0x73, 0x74, 0x48, 0x00,
	0x52, 0x05, 0x69, 0x6d, 0x61, 0x67, 0x65, 0x12, 0x2b, 0x0a, 0x05, 0x76, 0x69, 0x64, 0x65, 0x6f,
	0x18, 0x0d, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x13, 0x2e, 0x66, 0x65, 0x65, 0x64, 0x73, 0x2e, 0x76,
	0x31, 0x2e, 0x56, 0x69, 0x64, 0x65, 0x6f, 0x50, 0x6f, 0x73, 0x74, 0x48, 0x00, 0x52, 0x05, 0x76,
	0x69, 0x64, 0x65, 0x6f, 0x12, 0x2b, 0x0a, 0x05, 0x61, 0x75, 0x64, 0x69, 0x6f, 0x18, 0x0e, 0x20,
	0x01, 0x28, 0x0b, 0x32, 0x13, 0x2e, 0x66, 0x65, 0x65, 0x64, 0x73, 0x2e, 0x76, 0x31, 0x2e, 0x41,
	0x75, 0x64, 0x69, 0x6f, 0x50, 0x6f, 0x73, 0x74, 0x48, 0x00, 0x52, 0x05, 0x61, 0x75, 0x64, 0x69,
	0x6f, 0x42, 0x06, 0x0a, 0x04, 0x70, 0x6f, 0x73, 0x74, 0x22, 0x8b, 0x01, 0x0a, 0x08, 0x50, 0x6f,
	0x73, 0x74, 0x56, 0x69, 0x65, 0x77, 0x12, 0x22, 0x0a, 0x04, 0x70, 0x6f, 0x73, 0x74, 0x18, 0x01,
	0x20, 0x01, 0x28, 0x0b, 0x32, 0x0e, 0x2e, 0x66, 0x65, 0x65, 0x64, 0x73, 0x2e, 0x76, 0x31, 0x2e,
	0x50, 0x6f, 0x73, 0x74, 0x52, 0x04, 0x70, 0x6f, 0x73, 0x74, 0x12, 0x25, 0x0a, 0x0e, 0x63, 0x68,
	0x69, 0x6c, 0x64, 0x72, 0x65, 0x6e, 0x5f, 0x63, 0x6f, 0x75, 0x6e, 0x74, 0x18, 0x02, 0x20, 0x01,
	0x28, 0x04, 0x52, 0x0d, 0x63, 0x68, 0x69, 0x6c, 0x64, 0x72, 0x65, 0x6e, 0x43, 0x6f, 0x75, 0x6e,
	0x74, 0x12, 0x34, 0x0a, 0x09, 0x72, 0x65, 0x61, 0x63, 0x74, 0x69, 0x6f, 0x6e, 0x73, 0x18, 0x03,
	0x20, 0x03, 0x28, 0x0b, 0x32, 0x16, 0x2e, 0x66, 0x65, 0x65, 0x64, 0x73, 0x2e, 0x76, 0x31, 0x2e,
	0x52, 0x65, 0x61, 0x63, 0x74, 0x69, 0x6f, 0x6e, 0x56, 0x69, 0x65, 0x77, 0x52, 0x09, 0x72, 0x65,
	0x61, 0x63, 0x74, 0x69, 0x6f, 0x6e, 0x73, 0x22, 0x5e, 0x0a, 0x0c, 0x52, 0x65, 0x61, 0x63, 0x74,
	0x69, 0x6f, 0x6e, 0x56, 0x69, 0x65, 0x77, 0x12, 0x12, 0x0a, 0x04, 0x69, 0x63, 0x6f, 0x6e, 0x18,
	0x01, 0x20, 0x01, 0x28, 0x09, 0x52, 0x04, 0x69, 0x63, 0x6f, 0x6e, 0x12, 0x14, 0x0a, 0x05, 0x63,
	0x6f, 0x75, 0x6e, 0x74, 0x18, 0x02, 0x20, 0x01, 0x28, 0x0d, 0x52, 0x05, 0x63, 0x6f, 0x75, 0x6e,
	0x74, 0x12, 0x24, 0x0a, 0x0e, 0x75, 0x73, 0x65, 0x72, 0x5f, 0x68, 0x61, 0x73, 0x5f, 0x76, 0x6f,
	0x74, 0x65, 0x64, 0x18, 0x03, 0x20, 0x01, 0x28, 0x08, 0x52, 0x0c, 0x75, 0x73, 0x65, 0x72, 0x48,
	0x61, 0x73, 0x56, 0x6f, 0x74, 0x65, 0x64, 0x42, 0x39, 0x5a, 0x37, 0x67, 0x69, 0x74, 0x68, 0x75,
	0x62, 0x2e, 0x63, 0x6f, 0x6d, 0x2f, 0x73, 0x61, 0x6d, 0x6f, 0x75, 0x72, 0x61, 0x69, 0x77, 0x6f,
	0x72, 0x6c, 0x64, 0x2f, 0x7a, 0x65, 0x6e, 0x61, 0x6f, 0x2f, 0x62, 0x61, 0x63, 0x6b, 0x65, 0x6e,
	0x64, 0x2f, 0x66, 0x65, 0x65, 0x64, 0x73, 0x2f, 0x76, 0x31, 0x3b, 0x66, 0x65, 0x65, 0x64, 0x73,
	0x76, 0x31, 0x62, 0x06, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x33,
})

var (
	file_feeds_v1_feeds_proto_rawDescOnce sync.Once
	file_feeds_v1_feeds_proto_rawDescData []byte
)

func file_feeds_v1_feeds_proto_rawDescGZIP() []byte {
	file_feeds_v1_feeds_proto_rawDescOnce.Do(func() {
		file_feeds_v1_feeds_proto_rawDescData = protoimpl.X.CompressGZIP(unsafe.Slice(unsafe.StringData(file_feeds_v1_feeds_proto_rawDesc), len(file_feeds_v1_feeds_proto_rawDesc)))
	})
	return file_feeds_v1_feeds_proto_rawDescData
}

var file_feeds_v1_feeds_proto_msgTypes = make([]protoimpl.MessageInfo, 12)
var file_feeds_v1_feeds_proto_goTypes = []any{
	(*PostGeoLoc)(nil),   // 0: feeds.v1.PostGeoLoc
	(*StandardPost)(nil), // 1: feeds.v1.StandardPost
	(*ArticlePost)(nil),  // 2: feeds.v1.ArticlePost
	(*LinkPost)(nil),     // 3: feeds.v1.LinkPost
	(*ImagePost)(nil),    // 4: feeds.v1.ImagePost
	(*AudioPost)(nil),    // 5: feeds.v1.AudioPost
	(*VideoPost)(nil),    // 6: feeds.v1.VideoPost
	(*Reaction)(nil),     // 7: feeds.v1.Reaction
	(*Tip)(nil),          // 8: feeds.v1.Tip
	(*Post)(nil),         // 9: feeds.v1.Post
	(*PostView)(nil),     // 10: feeds.v1.PostView
	(*ReactionView)(nil), // 11: feeds.v1.ReactionView
}
var file_feeds_v1_feeds_proto_depIdxs = []int32{
	0,  // 0: feeds.v1.Post.loc:type_name -> feeds.v1.PostGeoLoc
	1,  // 1: feeds.v1.Post.standard:type_name -> feeds.v1.StandardPost
	2,  // 2: feeds.v1.Post.article:type_name -> feeds.v1.ArticlePost
	3,  // 3: feeds.v1.Post.link:type_name -> feeds.v1.LinkPost
	4,  // 4: feeds.v1.Post.image:type_name -> feeds.v1.ImagePost
	6,  // 5: feeds.v1.Post.video:type_name -> feeds.v1.VideoPost
	5,  // 6: feeds.v1.Post.audio:type_name -> feeds.v1.AudioPost
	9,  // 7: feeds.v1.PostView.post:type_name -> feeds.v1.Post
	11, // 8: feeds.v1.PostView.reactions:type_name -> feeds.v1.ReactionView
	9,  // [9:9] is the sub-list for method output_type
	9,  // [9:9] is the sub-list for method input_type
	9,  // [9:9] is the sub-list for extension type_name
	9,  // [9:9] is the sub-list for extension extendee
	0,  // [0:9] is the sub-list for field type_name
}

func init() { file_feeds_v1_feeds_proto_init() }
func file_feeds_v1_feeds_proto_init() {
	if File_feeds_v1_feeds_proto != nil {
		return
	}
	file_feeds_v1_feeds_proto_msgTypes[9].OneofWrappers = []any{
		(*Post_Standard)(nil),
		(*Post_Article)(nil),
		(*Post_Link)(nil),
		(*Post_Image)(nil),
		(*Post_Video)(nil),
		(*Post_Audio)(nil),
	}
	type x struct{}
	out := protoimpl.TypeBuilder{
		File: protoimpl.DescBuilder{
			GoPackagePath: reflect.TypeOf(x{}).PkgPath(),
			RawDescriptor: unsafe.Slice(unsafe.StringData(file_feeds_v1_feeds_proto_rawDesc), len(file_feeds_v1_feeds_proto_rawDesc)),
			NumEnums:      0,
			NumMessages:   12,
			NumExtensions: 0,
			NumServices:   0,
		},
		GoTypes:           file_feeds_v1_feeds_proto_goTypes,
		DependencyIndexes: file_feeds_v1_feeds_proto_depIdxs,
		MessageInfos:      file_feeds_v1_feeds_proto_msgTypes,
	}.Build()
	File_feeds_v1_feeds_proto = out.File
	file_feeds_v1_feeds_proto_goTypes = nil
	file_feeds_v1_feeds_proto_depIdxs = nil
}
