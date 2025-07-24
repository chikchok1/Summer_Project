document.addEventListener("DOMContentLoaded", () => {
  let isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";
  let currentUser = sessionStorage.getItem("currentUser") || "guest_user";

  const loginBtn = document.getElementById("loginButton");
  const signupBtn = document.getElementById("signupButton");
  const logoutBtn = document.getElementById("logoutButton");

  if (isLoggedIn) {
    loginBtn.style.display = "none";
    signupBtn.style.display = "none";
    logoutBtn.style.display = "block";
  } else {
    loginBtn.style.display = "block";
    signupBtn.style.display = "block";
    logoutBtn.style.display = "none";
  }

  logoutBtn.querySelector("a").addEventListener("click", (e) => {
    e.preventDefault();
    sessionStorage.clear();
    window.location.href = "/Summer_Project/html/index.html";
  });

  const container = document.getElementById("post-container");
  const modal = document.getElementById("post-modal");
  const modalForm = document.getElementById("modal-post-form");
  const modalTextarea = document.getElementById("modal-post-content");
  const modalImage = document.getElementById("modal-post-image");
  const closeBtn = document.querySelector(".close-btn");
  const tagsInput = document.getElementById("modal-post-tags");

  document.querySelectorAll(".sidebar li").forEach((li) => {
    if (li.textContent === "게시글 작성하기") {
      li.addEventListener("click", () => {
        if (!isLoggedIn) {
          alert("로그인이 필요합니다.");
          return;
        }
        modal.classList.remove("hidden");
      });
    }
  });

  closeBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  function savePosts(posts) {
    localStorage.setItem("posts", JSON.stringify(posts));
  }

  function loadPosts() {
    return JSON.parse(localStorage.getItem("posts") || "[]");
  }

  function renderPost(post, index) {
    const template = document.getElementById("post-template");
    const clone = template.content.cloneNode(true);

    clone.querySelector(".post-user").textContent = post.user;
    clone.querySelector(".post-date").textContent = post.date;
    clone.querySelector(".post-text").textContent = post.text;
    clone.querySelector(".post-tags").textContent = post.tags || "";

    const img = clone.querySelector(".post-image");
    if (post.image) {
      img.src = post.image;
    } else {
      img.style.display = "none";
    }

    const likeBtn = clone.querySelector(".like-btn");
    likeBtn.textContent = `❤️ 좋아요 ${post.likes}`;
    likeBtn.onclick = () => {
      if (!post.liked && isLoggedIn) {
        post.likes++;
        post.liked = true;
        likeBtn.textContent = `❤️ 좋아요 ${post.likes}`;
        let posts = loadPosts();
        posts[index] = post;
        savePosts(posts);
      }
    };

    const commentBtn = clone.querySelector(".comment-btn");
    const commentCount = commentBtn.querySelector(".comment-badge");

    commentBtn.onclick = () => {
      // 이미 열려 있는 동일한 팝업이 있는지 확인
      const existingPopup = document.querySelector(
        `.comment-popup[data-index="${index}"]`
      );

      if (existingPopup) {
        // 같은 게시글의 팝업이 열려있으면 토글로 닫기
        existingPopup.remove();
        return;
      }
      document.querySelectorAll(".comment-popup").forEach((p) => p.remove());

      const newPopup = document.createElement("div");
      newPopup.className = "comment-popup";
      newPopup.setAttribute("data-index", index);

      newPopup.style.position = "fixed";
      newPopup.style.top = "50%";
      newPopup.style.right = "50px";
      newPopup.style.transform = "translateY(-50%)";
      newPopup.style.zIndex = "3000";

      newPopup.innerHTML = `
        <div class="popup-header">
          댓글
          <span class="close-comment-popup" style="cursor: pointer;">&times;</span>
        </div>
        <div class="popup-comments">
          <ul class="comment-list"></ul>
        </div>
        <div class="popup-footer">
          <input class="comment-input" type="text" placeholder="댓글을 입력하세요..." />
          <button class="comment-submit">등록</button>
        </div>
      `;

      const commentList = newPopup.querySelector(".comment-list");
      const input = newPopup.querySelector(".comment-input");

      function renderComments() {
        commentList.innerHTML = "";
        post.comments.forEach((c, ci) => {
          const li = document.createElement("li");
          li.innerHTML = `<strong>${c.user}</strong> ${
            c.text
          } <button class="comment-like">👍 ${c.likes || 0}</button>`;
          li.querySelector(".comment-like").onclick = () => {
            c.likes = (c.likes || 0) + 1;
            let posts = loadPosts();
            posts[index].comments[ci] = c;
            savePosts(posts);
            renderComments();
            commentCount.textContent = post.comments.length;
          };
          commentList.appendChild(li);
        });
      }

      renderComments();

      newPopup.querySelector(".comment-submit").onclick = () => {
        const text = input.value.trim();
        if (text) {
          const comment = { user: currentUser, text, likes: 0 };
          post.comments.push(comment);
          let posts = loadPosts();
          posts[index] = post;
          savePosts(posts);
          input.value = "";
          renderComments();
          commentCount.textContent = post.comments.length;
        }
      };

      newPopup.querySelector(".close-comment-popup").onclick = () => {
        newPopup.remove();
      };

      document.body.appendChild(newPopup);
    };

    container.appendChild(clone);
  }

  function renderAllPosts() {
    container.innerHTML = "";
    const posts = loadPosts();
    posts.forEach((post, index) => renderPost(post, index));
  }

  modalForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = modalTextarea.value;
    const tags = tagsInput.value.trim();
    const file = modalImage.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      const post = {
        user: currentUser,
        date: new Date().toLocaleString(),
        text,
        tags,
        image: file ? reader.result : null,
        likes: 0,
        liked: false,
        comments: [],
      };
      const posts = loadPosts();
      posts.unshift(post);
      savePosts(posts);
      renderAllPosts();
      modalForm.reset();
      modal.classList.add("hidden");
    };

    if (file) reader.readAsDataURL(file);
    else reader.onload();
  });

  renderAllPosts();
});
