// DOM 요소
const profileImage = document.getElementById("profileImage");
const profileImageWrapper = document.querySelector(".profile-image-wrapper");
const imageInput = document.getElementById("imageInput");
const displayNameElement = document.getElementById("displayName");
const bioElement = document.getElementById("bio");
const phoneNumberElement = document.getElementById("phoneNumber");
const editProfileBtn = document.getElementById("editProfileBtn");
const userPostsGrid = document.getElementById("userPostsGrid");

// 모달 DOM 요소
const editModal = document.getElementById("editModal");
const nameInput = document.getElementById("nameInput");
const phoneInput = document.getElementById("phoneInput");
const bioInput = document.getElementById("bioInput");
const saveBtn = document.getElementById("saveBtn");
const closeEditModal = document.getElementById("closeEditModal");

const imageModal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const closeImageModal = document.getElementById("closeImageModal");

const commentModal = document.getElementById("commentModal");
const modalPostTitle = document.getElementById("modalPostTitle");
const modalPostImage = document.getElementById("modalPostImage");
const modalPostText = document.getElementById("modalPostText");
const modalPostTags = document.getElementById("modalPostTags");
const modalPostAuthor = document.getElementById("modalPostAuthor");
const modalPostTime = document.getElementById("modalPostTime");
const modalCommentList = document.getElementById("modalCommentList");
const modalCommentInput = document.getElementById("modalCommentInput");
const modalCommentSubmitButton = document.getElementById(
  "modalCommentSubmitButton"
);
const closeCommentModalButton = document.getElementById(
  "closeCommentModalButton"
);

const confirmationModal = document.getElementById("confirmationModal");
const confirmationMessage = document.getElementById("confirmationMessage");
const confirmYesBtn = document.getElementById("confirmYesBtn");
const confirmNoBtn = document.getElementById("confirmNoBtn");

const alertDialog = document.getElementById("alertDialog");
const alertMessage = document.getElementById("alertMessage");
const closeAlertModal = document.getElementById("closeAlertModal");

// 툴바 버튼
const profileLoginButton = document.getElementById("profileLoginButton");
const profileSignupButton = document.getElementById("profileSignupButton");
const profileLogoutButton = document.getElementById("profileLogoutButton");

// 상태 변수
let currentUserProfile = {};
let allPosts = [];
let currentViewingPostCard = null;

// =================================================================
// 🌐 공용 함수
// =================================================================

/**
 * 커스텀 알림(alert) 모달을 표시합니다.
 * @param {string} message - 모달에 표시할 메시지.
 */
function showCustomAlert(message) {
  alertMessage.textContent = message;
  alertDialog.style.display = "flex";
}

/**
 * 커스텀 확인(confirm) 모달을 표시하고 사용자의 응답을 Promise로 반환합니다.
 * @param {string} message - 모달에 표시할 질문 메시지.
 * @returns {Promise<boolean>} - 사용자가 '네'를 클릭하면 true, '아니오'를 클릭하면 false를 resolve하는 Promise.
 */
function showCustomConfirm(message) {
  return new Promise((resolve) => {
    confirmationMessage.textContent = message;
    confirmationModal.style.display = "flex";

    confirmYesBtn.onclick = () => {
      confirmationModal.style.display = "none";
      resolve(true);
    };
    confirmNoBtn.onclick = () => {
      confirmationModal.style.display = "none";
      resolve(false);
    };
  });
}

/**
 * 특정 ID의 게시글을 삭제합니다.
 * @param {string} postId - 삭제할 게시글의 ID.
 */
function deletePost(postId) {
  allPosts = allPosts.filter((post) => post.id !== postId);
  savePosts();
  renderUserPosts();
  showCustomAlert("게시글이 삭제되었습니다.");
}

// =================================================================
// 🌐 데이터 관리 함수
// =================================================================

function loadPosts() {
  const storedPosts = localStorage.getItem("snsPosts");
  if (storedPosts) {
    allPosts = JSON.parse(storedPosts);
    allPosts.forEach((post) => {
      if (!post.likedBy) post.likedBy = [];
      if (!post.comments) post.comments = [];
      const migrateComments = (comments) => {
        comments.forEach((comment) => {
          if (comment.likers && !comment.likedBy) {
            comment.likedBy = [...comment.likers];
            delete comment.likers;
          } else if (!comment.likedBy) {
            comment.likedBy = [];
          }
          delete comment.likes;
          delete comment.liked;
          if (!comment.replies) {
            comment.replies = [];
          } else {
            migrateComments(comment.replies);
          }
        });
      };
      migrateComments(post.comments);
    });
  } else {
    allPosts = [];
  }
}

function savePosts() {
  localStorage.setItem("snsPosts", JSON.stringify(allPosts));
}

// =================================================================
// 👤 프로필 관리 함수
// =================================================================

function loadUserProfile() {
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (!loggedInUser) {
    displayNameElement.textContent = "로그인 필요";
    bioElement.textContent = "프로필을 보려면 로그인하세요.";
    profileImage.src = getRandomProfileUrl();
    editProfileBtn.style.display = "none";
    profileLoginButton.style.display = "list-item";
    profileSignupButton.style.display = "list-item";
    profileLogoutButton.style.display = "none";
    userPostsGrid.innerHTML =
      '<p class="text-gray-500 text-center col-span-full">게시글을 보려면 로그인해주세요.</p>';
    return;
  }

  const users = JSON.parse(localStorage.getItem("users")) || [];
  const user = users.find((u) => u.username === loggedInUser);

  if (user) {
    currentUserProfile = {
      username: user.username,
      bio: user.bio || "인사말을 작성해주세요.",
      phoneNumber: user.phoneNumber || "전화번호 없음",
      profileImageBase64: user.profileImageBase64 || getRandomProfileUrl(),
    };
    displayNameElement.textContent = currentUserProfile.username;
    bioElement.textContent = currentUserProfile.bio;
    phoneNumberElement.textContent = currentUserProfile.phoneNumber;
    profileImage.src = currentUserProfile.profileImageBase64;
    editProfileBtn.style.display = "block";
    profileLoginButton.style.display = "none";
    profileSignupButton.style.display = "none";
    profileLogoutButton.style.display = "list-item";

    loadPosts();
    renderUserPosts();
  } else {
    localStorage.removeItem("loggedInUser");
    loadUserProfile();
  }
}

function saveUserProfile() {
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (!loggedInUser) return;

  let users = JSON.parse(localStorage.getItem("users")) || [];
  const userIndex = users.findIndex((u) => u.username === loggedInUser);

  if (userIndex !== -1) {
    users[userIndex] = { ...users[userIndex], ...currentUserProfile };
    localStorage.setItem("users", JSON.stringify(users));
  }
}

function getRandomProfileUrl() {
  return `https://source.unsplash.com/random/150x150?profile&sig=${Math.random()}`;
}

function updateDataOnUsernameChange(oldUsername, newUsername) {
  allPosts.forEach((post) => {
    if (post.author === oldUsername) {
      post.author = newUsername;
    }
    const updateCommentUsername = (comments) => {
      if (!comments) return;
      comments.forEach((comment) => {
        if (comment.username === oldUsername) {
          comment.username = newUsername;
        }
        if (comment.replies) {
          updateCommentUsername(comment.replies);
        }
      });
    };
    updateCommentUsername(post.comments);
  });
  savePosts();
}

// =================================================================
// 🖼️ 렌더링 함수
// =================================================================

function renderUserPosts() {
  userPostsGrid.innerHTML = "";
  const loggedInUser = localStorage.getItem("loggedInUser");
  const userPosts = allPosts.filter((post) => post.author === loggedInUser);

  if (userPosts.length === 0) {
    userPostsGrid.innerHTML =
      '<p class="text-gray-500 text-center col-span-full">아직 작성한 게시글이 없습니다.</p>';
    return;
  }

  userPosts.forEach((post) => {
    const postCard = createPostCardElement(post);
    userPostsGrid.appendChild(postCard);
  });
}

function createPostCardElement(postData) {
  const postCard = document.createElement("div");
  postCard.classList.add("post-card");
  postCard.dataset.postId = postData.id;

  const truncatedContent =
    postData.text.length > 50
      ? postData.text.substring(0, 47) + "..."
      : postData.text;
  let imageHtml = postData.imageUrl
    ? `<img src="${postData.imageUrl}" alt="게시글 이미지" class="post-card-image">`
    : "";

  // [수정] 게시글 제목 대신 작성자 이름이 표시되도록 변경
  postCard.innerHTML = `
              ${imageHtml}
              <div class="post-card-content-wrapper">
                  <h4 class="post-card-title">${postData.author}</h4>
                  <p class="post-card-text">${truncatedContent}</p>
              </div>
              <button class="post-card-delete-btn" aria-label="삭제">&times;</button>
          `;

  postCard.addEventListener("click", (event) => {
    if (!event.target.classList.contains("post-card-delete-btn")) {
      openPostViewModal(postData.id);
    }
  });

  const deleteBtn = postCard.querySelector(".post-card-delete-btn");
  deleteBtn.addEventListener("click", async (event) => {
    event.stopPropagation();
    const confirmed = await showCustomConfirm(
      "이 게시글을 정말 삭제하시겠습니까?"
    );
    if (confirmed) {
      deletePost(postData.id);
    }
  });

  return postCard;
}

function openPostViewModal(postId) {
  const postData = allPosts.find((p) => p.id === postId);
  if (!postData) return;

  currentViewingPostCard = postData;

  modalPostTitle.textContent = postData.text.split("\n")[0] || "제목 없음";
  modalPostText.textContent = postData.text;
  modalPostAuthor.textContent = `작성자: ${postData.author}`;
  modalPostTime.textContent = postData.time;

  if (postData.imageUrl) {
    modalPostImage.src = postData.imageUrl;
    modalPostImage.classList.remove("hidden");
  } else {
    modalPostImage.classList.add("hidden");
    modalPostImage.src = "";
  }

  modalPostTags.innerHTML = (postData.tags || [])
    .map(
      (tag) =>
        `<span class="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">#${tag}</span>`
    )
    .join("");
  window.renderComments(postData.comments || [], modalCommentList);
  commentModal.style.display = "flex";
}

// =================================================================
// 💬 댓글 관련 함수 (전역 window 객체에 할당하여 모듈처럼 사용)
// =================================================================

window.renderComments = function (comments, container, isReply = false) {
  container.innerHTML = "";
  const loggedInUser = localStorage.getItem("loggedInUser");

  if (!comments || comments.length === 0) {
    const noCommentMessage = document.createElement("p");
    noCommentMessage.className = "text-gray-500 text-center py-4";
    noCommentMessage.textContent = isReply
      ? "아직 답글이 없습니다."
      : "아직 댓글이 없습니다. 첫 댓글을 남겨보세요!";
    container.appendChild(noCommentMessage);
    return;
  }

  comments.forEach((comment) => {
    const hasUserLikedComment =
      loggedInUser && (comment.likedBy || []).includes(loggedInUser);
    const commentItem = document.createElement("div");
    commentItem.dataset.id = comment.id;
    commentItem.className = isReply ? "reply-item" : "comment-item";
    commentItem.innerHTML = `
                    <div class="comment-content-wrapper">
                        <div class="comment-text-line">
                            <span class="comment-username">${
                              comment.username
                            }</span>
                            <span class="comment-body">${comment.text}</span>
                        </div>
                        <div class="comment-time">${comment.time}</div>
                    </div>
                    <div class="comment-actions">
                        <button class="like-button ${
                          hasUserLikedComment ? "text-red-500" : "text-gray-500"
                        }" onclick="window.toggleCommentLike(this)">
                            <span class="comment-like-count">${
                              (comment.likedBy || []).length
                            }개</span> 좋아요
                        </button>
                        ${
                          !isReply
                            ? `<button onclick="window.toggleReplyInput(this)">답글 달기</button>`
                            : ""
                        }
                    </div>
                    <div class="reply-input-area hidden mt-3">
                        <input type="text" placeholder="답글을 작성하세요..." class="w-full px-3 py-2 text-sm border rounded-lg">
                        <button onclick="window.submitReply(this)">등록</button>
                    </div>
                    ${
                      !isReply && comment.replies && comment.replies.length > 0
                        ? `<button class="view-replies-toggle" onclick="window.toggleViewReplies(this)">— 답글 보기 (${comment.replies.length}개)</button>`
                        : ""
                    }
                    <div class="replies-list mt-3 space-y-2 hidden"></div>
                `;
    container.appendChild(commentItem);

    if (comment.replies && comment.replies.length > 0) {
      const repliesListContainer = commentItem.querySelector(".replies-list");
      window.renderComments(comment.replies, repliesListContainer, true);
    }
  });
};

window.toggleCommentLike = function (button) {
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (!loggedInUser) {
    showCustomAlert("로그인해야 좋아요를 누를 수 있습니다.");
    return;
  }
  const commentItem = button.closest(".comment-item, .reply-item");
  const commentId = commentItem.dataset.id;
  const findCommentOrReply = (commentsArray, id) => {
    for (const item of commentsArray) {
      if (item.id === id) return item;
      if (item.replies) {
        const foundInReplies = findCommentOrReply(item.replies, id);
        if (foundInReplies) return foundInReplies;
      }
    }
    return null;
  };
  const commentObj = findCommentOrReply(
    currentViewingPostCard.comments,
    commentId
  );
  if (commentObj) {
    if (!commentObj.likedBy) commentObj.likedBy = [];
    const likeIndex = commentObj.likedBy.indexOf(loggedInUser);
    if (likeIndex > -1) {
      commentObj.likedBy.splice(likeIndex, 1);
    } else {
      commentObj.likedBy.push(loggedInUser);
    }
    savePosts();
    const hasUserLiked = commentObj.likedBy.includes(loggedInUser);
    button.classList.toggle("text-red-500", hasUserLiked);
    button.classList.toggle("text-gray-500", !hasUserLiked);
    button.querySelector(
      ".comment-like-count"
    ).textContent = `${commentObj.likedBy.length}개`;
  }
};

window.toggleReplyInput = function (button) {
  const commentItem = button.closest(".comment-item");
  const replyInputArea = commentItem.querySelector(".reply-input-area");
  replyInputArea.classList.toggle("hidden");
  if (!replyInputArea.classList.contains("hidden")) {
    replyInputArea.querySelector("input").focus();
  }
};

window.submitReply = function (button) {
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (!loggedInUser) {
    showCustomAlert("로그인해야 답글을 작성할 수 있습니다.");
    return;
  }
  const replyInputArea = button.closest(".reply-input-area");
  const replyInput = replyInputArea.querySelector("input");
  const replyText = replyInput.value.trim();
  if (!replyText) {
    showCustomAlert("답글 내용을 입력해주세요.");
    return;
  }
  const parentCommentItem = replyInputArea.closest(".comment-item");
  const parentCommentId = parentCommentItem.dataset.id;
  const findComment = (commentsArray, id) => {
    for (const item of commentsArray) {
      if (item.id === id) return item;
      if (item.replies) {
        const found = findComment(item.replies, id);
        if (found) return found;
      }
    }
    return null;
  };
  const parentCommentObj = findComment(
    currentViewingPostCard.comments,
    parentCommentId
  );
  if (parentCommentObj) {
    const now = new Date();
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    };
    const currentTimeFormatted = now.toLocaleString("ko-KR", options);
    const newReply = {
      id: "reply-" + Date.now(),
      username: loggedInUser,
      text: replyText,
      time: currentTimeFormatted,
      likedBy: [],
      replies: [],
    };
    if (!parentCommentObj.replies) parentCommentObj.replies = [];
    parentCommentObj.replies.push(newReply);
    savePosts();
    window.renderComments(currentViewingPostCard.comments, modalCommentList);
  }
};

window.toggleViewReplies = function (button) {
  const commentItem = button.closest(".comment-item");
  const repliesList = commentItem.querySelector(".replies-list");
  const isHidden = repliesList.classList.contains("hidden");
  repliesList.classList.toggle("hidden");
  button.textContent = isHidden
    ? `— 답글 숨기기 (${repliesList.children.length}개)`
    : `— 답글 보기 (${repliesList.children.length}개)`;
};

// =================================================================
// 🚀 페이지 초기화 및 이벤트 리스너
// =================================================================

document.addEventListener("DOMContentLoaded", () => {
  loadUserProfile();

  // 프로필 이미지 변경 리스너
  imageInput.addEventListener("change", function () {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        profileImage.src = e.target.result;
        currentUserProfile.profileImageBase64 = e.target.result;
        saveUserProfile();
      };
      reader.readAsDataURL(file);
    }
  });

  // 프로필 편집 모달 열기 리스너
  editProfileBtn.addEventListener("click", () => {
    nameInput.value = currentUserProfile.username;
    phoneInput.value = currentUserProfile.phoneNumber;
    bioInput.value = currentUserProfile.bio;
    editModal.style.display = "flex";
  });

  // 프로필 저장 리스너
  saveBtn.addEventListener("click", () => {
    const oldUsername = currentUserProfile.username;
    const newUsername = nameInput.value.trim();

    currentUserProfile.username = newUsername;
    currentUserProfile.phoneNumber = phoneInput.value.trim();
    currentUserProfile.bio = bioInput.value.trim();

    saveUserProfile();

    if (oldUsername !== newUsername) {
      localStorage.setItem("loggedInUser", newUsername);
      updateDataOnUsernameChange(oldUsername, newUsername);
    }

    loadUserProfile();
    editModal.style.display = "none";
    showCustomAlert("프로필이 성공적으로 저장되었습니다!");
  });

  // 댓글 등록 리스너
  modalCommentSubmitButton.addEventListener("click", () => {
    const loggedInUser = localStorage.getItem("loggedInUser");
    if (!loggedInUser) {
      showCustomAlert("로그인해야 댓글을 작성할 수 있습니다.");
      return;
    }
    const commentText = modalCommentInput.value.trim();
    if (commentText && currentViewingPostCard) {
      const now = new Date();
      const options = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      };
      const currentTimeFormatted = now.toLocaleString("ko-KR", options);
      const newComment = {
        id: "comment-" + Date.now(),
        username: loggedInUser,
        text: commentText,
        time: currentTimeFormatted,
        likedBy: [],
        replies: [],
      };
      if (!currentViewingPostCard.comments)
        currentViewingPostCard.comments = [];
      currentViewingPostCard.comments.push(newComment);
      savePosts();
      window.renderComments(currentViewingPostCard.comments, modalCommentList);
      modalCommentInput.value = "";
      modalCommentList.scrollTop = modalCommentList.scrollHeight;
    }
  });

  // 로그아웃 리스너
  profileLogoutButton.addEventListener("click", () => {
    localStorage.removeItem("loggedInUser");
    window.location.reload();
  });

  // --- 엔터 키 입력 관련 리스너 ---

  // 프로필 편집 모달의 입력 필드에서 엔터 키 처리
  [nameInput, phoneInput, bioInput].forEach((input) => {
    input.addEventListener("keydown", (event) => {
      if (editModal.style.display === "flex" && event.key === "Enter") {
        event.preventDefault(); // 기본 동작(줄바꿈 등) 방지
        saveBtn.click();
      }
    });
  });

  // 댓글 입력창에서 엔터 키 처리
  modalCommentInput.addEventListener("keydown", (event) => {
    if (commentModal.style.display === "flex" && event.key === "Enter") {
      event.preventDefault();
      modalCommentSubmitButton.click();
    }
  });

  // 전역 엔터 키 리스너 (확인 및 알림 모달용)
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;

    // 확인 모달이 활성화된 경우 '네' 버튼 클릭
    if (confirmationModal.style.display === "flex") {
      confirmYesBtn.click();
    }
    // 알림 모달이 활성화된 경우 '확인' 버튼 클릭
    if (alertDialog.style.display === "flex") {
      closeAlertModal.click();
    }
  });

  // --- 모달 닫기 리스너 ---
  closeEditModal.addEventListener(
    "click",
    () => (editModal.style.display = "none")
  );
  closeCommentModalButton.addEventListener(
    "click",
    () => (commentModal.style.display = "none")
  );
  closeImageModal.addEventListener(
    "click",
    () => (imageModal.style.display = "none")
  );
  closeAlertModal.addEventListener(
    "click",
    () => (alertDialog.style.display = "none")
  );

  // --- 이미지 확대 리스너 ---
  profileImageWrapper.addEventListener("click", () => {
    modalImage.src = profileImage.src;
    imageModal.style.display = "flex";
  });
  modalPostImage.addEventListener("click", () => {
    modalImage.src = modalPostImage.src;
    imageModal.style.display = "flex";
  });
});
