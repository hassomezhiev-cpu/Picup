// ========== CUSTOM POPUP FUNCTION ==========
function showPopup(message, type = 'info', title = '') {
    const popup = document.getElementById('customPopup');
    const popupIcon = document.getElementById('popupIcon');
    const popupTitle = document.getElementById('popupTitle');
    const popupMessage = document.getElementById('popupMessage');
    const popupBtn = document.getElementById('popupBtn');
    const popupCancelBtn = document.getElementById('popupCancelBtn');
    
    // Hide cancel button for regular popups
    popupCancelBtn.style.display = 'none';
    popupBtn.textContent = 'OK';
    
    // Set icon based on type
    popupIcon.className = 'custom-popup-icon ' + type;
    switch(type) {
        case 'success':
            popupIcon.textContent = '✓';
            popupTitle.textContent = title || 'Success!';
            break;
        case 'error':
            popupIcon.textContent = '✕';
            popupTitle.textContent = title || 'Error';
            break;
        case 'warning':
            popupIcon.textContent = '!';
            popupTitle.textContent = title || 'Warning';
            break;
        default:
            popupIcon.textContent = 'i';
            popupTitle.textContent = title || 'Notice';
    }
    
    popupMessage.textContent = message;
    popup.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Close handlers
    const closePopup = () => {
        popup.classList.remove('active');
        document.body.style.overflow = 'auto';
    };
    
    popupBtn.onclick = closePopup;
    popup.querySelector('.custom-popup-overlay').onclick = closePopup;
}

// Custom confirm dialog - returns a Promise
function showConfirm(message, title = 'Confirm') {
    return new Promise((resolve) => {
        const popup = document.getElementById('customPopup');
        const popupIcon = document.getElementById('popupIcon');
        const popupTitle = document.getElementById('popupTitle');
        const popupMessage = document.getElementById('popupMessage');
        const popupBtn = document.getElementById('popupBtn');
        const popupCancelBtn = document.getElementById('popupCancelBtn');
        
        // Show cancel button for confirm dialogs
        popupCancelBtn.style.display = 'block';
        popupBtn.textContent = 'Yes';
        
        // Set warning style
        popupIcon.className = 'custom-popup-icon warning';
        popupIcon.textContent = '!';
        popupTitle.textContent = title;
        popupMessage.textContent = message;
        
        popup.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        const closePopup = (result) => {
            popup.classList.remove('active');
            document.body.style.overflow = 'auto';
            resolve(result);
        };
        
        popupBtn.onclick = () => closePopup(true);
        popupCancelBtn.onclick = () => closePopup(false);
        popup.querySelector('.custom-popup-overlay').onclick = () => closePopup(false);
    });
}

// ========== IMAGE UPLOAD ==========
const uploadBtn = document.querySelector('.btn-primary');
const gallery = document.querySelector('.gallery');
let uploadedImages = [];
let currentUser = null;

// ADMIN ACCOUNT - has full control
const ADMIN_EMAIL = 'hasso.mezhiev@gmail.com';
let isAdmin = false;

const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';
fileInput.multiple = true;
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

const categoryModal = document.getElementById('categoryModal');
const imageNameInput = document.getElementById('imageNameInput');
const categoryButtons = document.querySelectorAll('.category-option');
const confirmUploadBtn = document.getElementById('confirmUpload');
const cancelUploadBtn = document.getElementById('cancelUpload');
const categoryOverlay = document.querySelector('.category-overlay');

let selectedCategory = null;
let pendingFiles = [];

if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
        if (!currentUser) {
            showPopup('You must be logged in to upload images!\n\nClick "Login" to create an account.');
            return;
        }
        fileInput.click();
    });
}

fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files.length > 0) {
        pendingFiles = Array.from(files);
        openCategoryModal();
    }
    fileInput.value = '';
});

function openCategoryModal() {
    categoryModal.classList.add('active');
    imageNameInput.value = '';
    selectedCategory = null;
    categoryButtons.forEach(btn => btn.classList.remove('selected'));
    document.body.style.overflow = 'hidden';
}

function closeCategoryModal() {
    categoryModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    pendingFiles = [];
}

categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
        categoryButtons.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        selectedCategory = button.dataset.category;
    });
});

confirmUploadBtn.addEventListener('click', () => {
    const imageName = imageNameInput.value.trim();
    if (!imageName) {
        showPopup('Please enter an image name!', 'warning', 'Missing Name');
        return;
    }
    if (!selectedCategory) {
        showPopup('Please choose a category!', 'warning', 'Missing Category');
        return;
    }
    pendingFiles.forEach(file => {
        if (file.type.startsWith('image/')) {
            uploadImage(file, imageName, selectedCategory);
        }
    });
    closeCategoryModal();
});

cancelUploadBtn.addEventListener('click', closeCategoryModal);
categoryOverlay.addEventListener('click', closeCategoryModal);

async function uploadImage(file, name, category) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        const imageData = {
            url: e.target.result,
            name: name,
            category: category,
            uploadDate: new Date(),
            uploadedBy: currentUser ? currentUser.uid : 'anonymous',
            likes: 0,
            likedBy: []
        };

        // Save to Firestore
        if (currentUser) {
            try {
                const { collection, addDoc } = window.firebaseDBFunctions;
                const docRef = await addDoc(collection(window.firebaseDB, 'images'), imageData);
                imageData.id = docRef.id;
                console.log('Image saved with ID:', docRef.id);
            } catch (error) {
                console.error('Error saving:', error);
            }
        }

        uploadedImages.unshift(imageData);
        displayImages();
    };
    reader.readAsDataURL(file);
}

// Load images from Firestore (show all images in gallery)
async function loadImagesFromFirestore() {
    console.log('Loading images from Firestore...');
    console.log('Current user:', currentUser ? currentUser.uid : 'Not logged in');
    
    try {
        const { collection, getDocs } = window.firebaseDBFunctions;
        const querySnapshot = await getDocs(collection(window.firebaseDB, 'images'));
        
        console.log('Found', querySnapshot.docs.length, 'images in database');

        uploadedImages = [];

        // Show ALL images - no privacy filter in main gallery
        for (const docSnapshot of querySnapshot.docs) {
            const imageData = { id: docSnapshot.id, ...docSnapshot.data() };
            uploadedImages.push(imageData);
        }

        console.log('Showing', uploadedImages.length, 'images');

        // Sort by date (newest first)
        uploadedImages.sort((a, b) => {
            const dateA = a.uploadDate?.toDate ? a.uploadDate.toDate() : new Date(a.uploadDate);
            const dateB = b.uploadDate?.toDate ? b.uploadDate.toDate() : new Date(b.uploadDate);
            return dateB - dateA;
        });

        displayImages();
        hideLoadingOverlay();
    } catch (error) {
        console.error('Error loading images:', error);
        displayImages(); // Show placeholders even on error
        hideLoadingOverlay();
    }
}

// Hide loading overlay
function hideLoadingOverlay() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// ========== LIGHTBOX ==========
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxTitle = document.getElementById('lightboxTitle');
const lightboxCategory = document.getElementById('lightboxCategory');
const lightboxClose = document.querySelector('.lightbox-close');
const lightboxOverlay = document.querySelector('.lightbox-overlay');
const editNameBtn = document.getElementById('editNameBtn');
const editContainer = document.getElementById('editContainer');
const editNameInput = document.getElementById('editNameInput');
const categoryButtonsEdit = document.querySelectorAll('.category-option-edit');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');

let currentImageIndex = null;
let selectedEditCategory = null;

async function openLightbox(index) {
    currentImageIndex = index;
    const image = uploadedImages[index];
    lightboxImage.src = image.url;
    lightboxTitle.textContent = image.name;
    lightboxCategory.textContent = `Category: ${image.category}`;

    // Show uploader info
    const uploaderInfo = document.getElementById('lightboxUploader');
    if (image.uploadedBy && image.uploadedBy !== 'anonymous') {
        try {
            const { doc, getDoc } = window.firebaseDBFunctions;
            const uploaderDoc = await getDoc(doc(window.firebaseDB, 'users', image.uploadedBy));
            if (uploaderDoc.exists()) {
                const uploaderData = uploaderDoc.data();
                const uploaderName = `${uploaderData.firstName} ${uploaderData.lastName}`;

                // Only make clickable if user is logged in
                if (currentUser) {
                    uploaderInfo.innerHTML = `Uploaded by <span class="uploader-link" onclick="viewUserProfile('${image.uploadedBy}')">${uploaderName}</span>`;
                } else {
                    uploaderInfo.innerHTML = `Uploaded by <span style="color:#666">${uploaderName}</span>`;
                }
            } else {
                uploaderInfo.textContent = 'Uploaded by Unknown User';
            }
        } catch (error) {
            uploaderInfo.textContent = 'Uploaded by Unknown User';
        }
    } else {
        uploaderInfo.textContent = 'Uploaded by Anonymous';
    }

    // Show edit button for own images OR if admin
    if (currentUser && (image.uploadedBy === currentUser.uid || isAdmin)) {
        editNameBtn.style.display = 'block';
    } else {
        editNameBtn.style.display = 'none';
    }

    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// View user profile
async function viewUserProfile(userId) {
    if (!userId) return;

    try {
        const { doc, getDoc } = window.firebaseDBFunctions;
        const userDoc = await getDoc(doc(window.firebaseDB, 'users', userId));

        if (userDoc.exists()) {
            const userData = userDoc.data();

            // Check if profile is private
            if (userData.isPrivate && (!currentUser || currentUser.uid !== userId)) {
                showPopup('This profile is private.', 'warning', 'Private Profile');
                return;
            }

            // Close lightbox and show profile
            closeLightbox();
            showUserProfile(userId, userData);
        } else {
            showPopup('User not found.', 'error', 'Not Found');
        }
    } catch (error) {
        console.error('Error viewing profile:', error);
        showPopup('Could not load profile.', 'error', 'Error');
    }
}

// Show user profile modal
function showUserProfile(userId, userData) {
    // Create modal overlay
    const profileModal = document.createElement('div');
    profileModal.className = 'user-profile-modal';
    profileModal.id = 'userProfileModal';

    const userImages = uploadedImages.filter(img => img.uploadedBy === userId);
    const imageCount = userImages.length;
    
    // Admin controls HTML - both Deactivate and Delete buttons
    const adminControls = isAdmin && userId !== currentUser.uid ? `
        <div class="admin-controls">
            <button class="btn-deactivate" onclick="toggleUserDeactivation('${userId}', ${userData.isDeactivated || false})">
                ${userData.isDeactivated ? 'Activate Account' : 'Deactivate Account'}
            </button>
            <button class="btn-delete-user" onclick="deleteUserAccount('${userId}')">
                Delete Account
            </button>
        </div>
    ` : '';

    profileModal.innerHTML = `
        <div class="user-profile-overlay" onclick="closeUserProfile()"></div>
        <div class="user-profile-content">
            <button class="user-profile-close" onclick="closeUserProfile()">&times;</button>
            <div class="user-profile-header">
                <img src="${userData.avatar}" alt="Profile" class="user-profile-avatar">
                <div class="user-profile-info">
                    <h2>${userData.firstName} ${userData.lastName}</h2>
                    <p>${imageCount} ${imageCount === 1 ? 'upload' : 'uploads'}</p>
                    <p style="color:#999;font-size:12px;">${userData.email || ''}</p>
                    ${userData.isDeactivated ? '<p style="color:red;font-weight:bold;">DEACTIVATED</p>' : ''}
                </div>
            </div>
            ${adminControls}
            <div class="user-profile-gallery" id="userProfileGallery"></div>
        </div>
    `;

    document.body.appendChild(profileModal);
    document.body.style.overflow = 'hidden';

    // Display user's images
    const galleryEl = document.getElementById('userProfileGallery');
    if (imageCount === 0) {
        galleryEl.innerHTML = '<p style="text-align:center;padding:40px;color:#666;">No uploads yet.</p>';
    } else {
        userImages.forEach((image) => {
            const imageCard = document.createElement('div');
            imageCard.className = 'user-profile-image-card';

            const img = document.createElement('img');
            img.src = image.url;
            img.alt = image.name;
            const originalIndex = uploadedImages.indexOf(image);
            img.addEventListener('click', () => {
                closeUserProfile();
                openLightbox(originalIndex);
            });

            imageCard.appendChild(img);
            galleryEl.appendChild(imageCard);
        });
    }
}

// Toggle user deactivation (admin only)
async function toggleUserDeactivation(userId, currentlyDeactivated) {
    if (!isAdmin) {
        showPopup('Only admin can do this!', 'error', 'Access Denied');
        return;
    }
    
    try {
        const { doc, updateDoc } = window.firebaseDBFunctions;
        await updateDoc(doc(window.firebaseDB, 'users', userId), {
            isDeactivated: !currentlyDeactivated
        });
        
        showPopup(currentlyDeactivated ? 'Account has been activated!' : 'Account has been deactivated!', 'success', currentlyDeactivated ? 'Activated' : 'Deactivated');
        closeUserProfile();
    } catch (error) {
        console.error('Error updating user:', error);
        showPopup('Could not update user.', 'error', 'Error');
    }
}

// Delete user account completely (admin only)
async function deleteUserAccount(userId) {
    if (!isAdmin) {
        showPopup('Only admin can do this!', 'error', 'Access Denied');
        return;
    }
    
    const confirmed = await showConfirm('Are you sure you want to DELETE this account?\n\nThis will permanently delete the user profile and all their uploaded images.\n\nThis action cannot be undone!', 'Delete Account');
    
    if (!confirmed) return;
    
    try {
        const { doc, deleteDoc, collection, getDocs, query, where, updateDoc, arrayRemove } = window.firebaseDBFunctions;
        
        // 1. Delete all images uploaded by this user
        const imagesQuery = query(
            collection(window.firebaseDB, 'images'),
            where('uploadedBy', '==', userId)
        );
        const userImages = await getDocs(imagesQuery);
        
        for (const imageDoc of userImages.docs) {
            await deleteDoc(doc(window.firebaseDB, 'images', imageDoc.id));
        }
        console.log('Deleted', userImages.docs.length, 'images');
        
        // 2. Remove user's likes from all images
        const allImagesSnapshot = await getDocs(collection(window.firebaseDB, 'images'));
        for (const imageDoc of allImagesSnapshot.docs) {
            const imageData = imageDoc.data();
            if (imageData.likedBy && imageData.likedBy.includes(userId)) {
                await updateDoc(doc(window.firebaseDB, 'images', imageDoc.id), {
                    likedBy: arrayRemove(userId),
                    likes: (imageData.likes || 1) - 1
                });
            }
        }
        console.log('Removed user likes from images');
        
        // 3. Delete user document
        await deleteDoc(doc(window.firebaseDB, 'users', userId));
        console.log('Deleted user document');
        
        showPopup('Account deleted successfully!', 'success', 'Deleted');
        closeUserProfile();
        
        // Reload images
        await loadImagesFromFirestore();
        await loadAllUsers();
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showPopup('Could not delete user: ' + error.message, 'error', 'Error');
    }
}

// Close user profile modal
function closeUserProfile() {
    const modal = document.getElementById('userProfileModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
}

function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = 'auto';
    editContainer.style.display = 'none';
}

lightboxClose.addEventListener('click', closeLightbox);
lightboxOverlay.addEventListener('click', closeLightbox);

editNameBtn.addEventListener('click', () => {
    const image = uploadedImages[currentImageIndex];
    editContainer.style.display = 'block';
    editNameInput.value = image.name;
    selectedEditCategory = image.category;
    categoryButtonsEdit.forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.category === image.category) {
            btn.classList.add('selected');
        }
    });
    editNameInput.focus();
});

categoryButtonsEdit.forEach(button => {
    button.addEventListener('click', () => {
        categoryButtonsEdit.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        selectedEditCategory = button.dataset.category;
    });
});

saveBtn.addEventListener('click', async () => {
    const newName = editNameInput.value.trim();
    if (!newName) {
        showPopup('Please enter a name!', 'warning', 'Missing Name');
        return;
    }

    const image = uploadedImages[currentImageIndex];
    image.name = newName;

    // Update in Firestore
    if (image.id) {
        try {
            const { doc, updateDoc } = window.firebaseDBFunctions;
            await updateDoc(doc(window.firebaseDB, 'images', image.id), {
                name: newName
            });
        } catch (error) {
            console.error('Error updating image:', error);
        }
    }

    lightboxTitle.textContent = newName;
    editContainer.style.display = 'none';
    displayImages();
});

cancelBtn.addEventListener('click', () => {
    editContainer.style.display = 'none';
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('active')) {
        closeLightbox();
    }
});

// ========== DISPLAY IMAGES ==========
function displayImages() {
    gallery.innerHTML = '';

    // Display uploaded images
    uploadedImages.forEach((image, index) => {
        const imageCard = document.createElement('div');
        imageCard.className = 'image-card';

        const img = document.createElement('img');
        img.src = image.url;
        img.alt = image.name;
        img.className = 'uploaded-image';
        img.addEventListener('click', () => openLightbox(index));
        img.style.cursor = 'pointer';

        const likeCount = document.createElement('div');
        likeCount.className = 'like-count';
        likeCount.textContent = image.likes || 0;
        likeCount.style.display = (image.likes && image.likes > 0) ? 'block' : 'none';

        const likeBtn = document.createElement('button');
        likeBtn.className = 'like-btn';
        const isLiked = currentUser && image.likedBy && image.likedBy.includes(currentUser.uid);
        if (isLiked) likeBtn.classList.add('liked');

        const heartIcon = document.createElement('img');
        heartIcon.src = 'heart.png';
        heartIcon.alt = 'Like';
        likeBtn.appendChild(heartIcon);

        likeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!currentUser) {
                showPopup('You must be logged in to like images!', 'warning', 'Login Required');
                return;
            }
            toggleLike(index, likeBtn, likeCount);
        });

        // Show delete button for own images OR if admin
        if (currentUser && (image.uploadedBy === currentUser.uid || isAdmin)) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();

                // Delete from Firestore
                if (image.id) {
                    try {
                        const { doc, deleteDoc } = window.firebaseDBFunctions;
                        await deleteDoc(doc(window.firebaseDB, 'images', image.id));
                    } catch (error) {
                        console.error('Error deleting from Firestore:', error);
                    }
                }

                // Delete from local array
                uploadedImages.splice(index, 1);
                displayImages();
            });
            imageCard.appendChild(deleteBtn);
        }

        imageCard.appendChild(img);
        imageCard.appendChild(likeCount);
        imageCard.appendChild(likeBtn);
        gallery.appendChild(imageCard);
    });

    // Add placeholders after images
    showPlaceholders();
}

async function toggleLike(imageIndex, likeBtn, likeCountElement) {
    const image = uploadedImages[imageIndex];
    if (!image.likedBy) image.likedBy = [];
    if (!image.likes) image.likes = 0;

    const userLikedIndex = image.likedBy.indexOf(currentUser.uid);
    if (userLikedIndex > -1) {
        // Unlike
        image.likedBy.splice(userLikedIndex, 1);
        image.likes--;
        likeBtn.classList.remove('liked');
    } else {
        // Like
        image.likedBy.push(currentUser.uid);
        image.likes++;
        likeBtn.classList.add('liked');
        likeBtn.style.transform = 'scale(1.3)';
        setTimeout(() => { likeBtn.style.transform = 'scale(1)'; }, 200);
    }

    likeCountElement.textContent = image.likes;
    likeCountElement.style.display = image.likes > 0 ? 'block' : 'none';

    // Save to Firestore
    if (image.id) {
        try {
            const { doc, updateDoc } = window.firebaseDBFunctions;
            await updateDoc(doc(window.firebaseDB, 'images', image.id), {
                likes: image.likes,
                likedBy: image.likedBy
            });
        } catch (error) {
            console.error('Error updating likes:', error);
        }
    }
}

function showPlaceholders() {
    // Add placeholder cards for visual grid - always show at least 24 total cards
    const totalImages = uploadedImages.length;
    const minCards = 24;
    const placeholdersNeeded = Math.max(0, minCards - totalImages);

    for (let i = 0; i < placeholdersNeeded; i++) {
        const imageCard = document.createElement('div');
        imageCard.className = 'image-card';
        const placeholder = document.createElement('div');
        placeholder.className = 'image-placeholder';
        placeholder.style.cursor = 'pointer';
        placeholder.addEventListener('click', () => {
            if (!currentUser) {
                showPopup('You must be logged in to upload images!');
                return;
            }
            fileInput.click();
        });
        imageCard.appendChild(placeholder);
        gallery.appendChild(imageCard);
    }
}

// ========== FILTER & SEARCH ==========
const filterButtons = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

// Create search dropdown
const searchDropdown = document.createElement('div');
searchDropdown.className = 'search-results-dropdown';
searchDropdown.id = 'searchDropdown';
document.querySelector('.search-bar').appendChild(searchDropdown);

// All users cache for search
let allUsers = [];

// Load all users for search
async function loadAllUsers() {
    try {
        const { collection, getDocs } = window.firebaseDBFunctions;
        const querySnapshot = await getDocs(collection(window.firebaseDB, 'users'));
        allUsers = [];
        querySnapshot.forEach(doc => {
            allUsers.push({ id: doc.id, ...doc.data() });
        });
        console.log('Loaded', allUsers.length, 'users for search');
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Live search as user types
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.trim().toLowerCase();
    
    if (searchTerm.length < 1) {
        searchDropdown.classList.remove('active');
        return;
    }
    
    // Search users
    const matchingUsers = allUsers.filter(user => 
        (user.firstName && user.firstName.toLowerCase().includes(searchTerm)) ||
        (user.lastName && user.lastName.toLowerCase().includes(searchTerm)) ||
        (user.email && user.email.toLowerCase().includes(searchTerm)) ||
        (`${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm))
    );
    
    // Search images
    const matchingImages = uploadedImages.filter(img =>
        img.name.toLowerCase().includes(searchTerm) ||
        img.category.toLowerCase().includes(searchTerm)
    );
    
    // Build dropdown content
    let dropdownHTML = '';
    
    if (matchingUsers.length > 0) {
        dropdownHTML += '<div class="search-section-title">Users</div>';
        matchingUsers.slice(0, 5).forEach(user => {
            dropdownHTML += `
                <div class="search-result-item" onclick="openUserProfileFromSearch('${user.id}')">
                    <img src="${user.avatar || ''}" alt="${user.firstName}" class="search-result-avatar">
                    <div class="search-result-info">
                        <div class="search-result-name">${user.firstName} ${user.lastName}</div>
                        <div class="search-result-email">${user.email}</div>
                    </div>
                </div>
            `;
        });
    }
    
    if (matchingImages.length > 0) {
        dropdownHTML += '<div class="search-section-title">Images</div>';
        matchingImages.slice(0, 5).forEach((img, idx) => {
            const originalIndex = uploadedImages.indexOf(img);
            dropdownHTML += `
                <div class="search-result-item" onclick="openLightbox(${originalIndex}); closeSearchDropdown();">
                    <img src="${img.url}" alt="${img.name}" class="search-result-avatar" style="border-radius:8px;">
                    <div class="search-result-info">
                        <div class="search-result-name">${img.name}</div>
                        <div class="search-result-email">${img.category}</div>
                    </div>
                </div>
            `;
        });
    }
    
    if (matchingUsers.length === 0 && matchingImages.length === 0) {
        dropdownHTML = '<div class="search-result-item"><div class="search-result-info"><div class="search-result-name" style="color:#999;">No results found</div></div></div>';
    }
    
    searchDropdown.innerHTML = dropdownHTML;
    searchDropdown.classList.add('active');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-bar')) {
        searchDropdown.classList.remove('active');
    }
});

// Close search dropdown
function closeSearchDropdown() {
    searchDropdown.classList.remove('active');
    searchInput.value = '';
}

// Open user profile from search
async function openUserProfileFromSearch(userId) {
    closeSearchDropdown();
    
    if (!currentUser) {
        showPopup('You must be logged in to view profiles.', 'warning', 'Login Required');
        return;
    }
    
    try {
        const { doc, getDoc } = window.firebaseDBFunctions;
        const userDoc = await getDoc(doc(window.firebaseDB, 'users', userId));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Check if profile is private
            if (userData.isPrivate && userId !== currentUser.uid && !isAdmin) {
                showPopup('This profile is private.', 'warning', 'Private Profile');
                return;
            }
            
            showUserProfile(userId, userData);
        }
    } catch (error) {
        console.error('Error opening profile:', error);
    }
}

// Make functions global
window.openUserProfileFromSearch = openUserProfileFromSearch;
window.closeSearchDropdown = closeSearchDropdown;

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        filterImages(button.textContent);
        searchInput.value = '';
    });
});

function filterImages(category) {
    gallery.innerHTML = '';
    if (category === 'All') {
        displayImages();
    } else {
        const filtered = uploadedImages.filter(img => img.category === category);
        if (filtered.length === 0) {
            const noResults = document.createElement('div');
            noResults.style.cssText = 'grid-column:1/-1;text-align:center;padding:40px;font-family:K2D,sans-serif;font-size:18px;color:#666';
            noResults.textContent = `No images in category "${category}"`;
            gallery.appendChild(noResults);
        } else {
            filtered.forEach(image => {
                const imageCard = document.createElement('div');
                imageCard.className = 'image-card';
                const img = document.createElement('img');
                img.src = image.url;
                img.alt = image.name;
                img.className = 'uploaded-image';
                const originalIndex = uploadedImages.indexOf(image);
                img.addEventListener('click', () => openLightbox(originalIndex));
                img.style.cursor = 'pointer';

                // Like count
                const likeCount = document.createElement('div');
                likeCount.className = 'like-count';
                likeCount.textContent = image.likes || 0;
                likeCount.style.display = (image.likes && image.likes > 0) ? 'block' : 'none';

                // Like button
                const likeBtn = document.createElement('button');
                likeBtn.className = 'like-btn';
                const isLiked = currentUser && image.likedBy && image.likedBy.includes(currentUser.uid);
                if (isLiked) likeBtn.classList.add('liked');

                const heartIcon = document.createElement('img');
                heartIcon.src = 'heart.png';
                heartIcon.alt = 'Like';
                likeBtn.appendChild(heartIcon);

                likeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!currentUser) {
                        showPopup('You must be logged in to like images!', 'warning', 'Login Required');
                        return;
                    }
                    toggleLike(originalIndex, likeBtn, likeCount);
                });

                if (currentUser && (image.uploadedBy === currentUser.uid || isAdmin)) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'delete-btn';
                    deleteBtn.innerHTML = '×';
                    deleteBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (image.id) {
                            try {
                                const { doc, deleteDoc } = window.firebaseDBFunctions;
                                await deleteDoc(doc(window.firebaseDB, 'images', image.id));
                            } catch (error) {
                                console.error('Error deleting:', error);
                            }
                        }
                        uploadedImages.splice(originalIndex, 1);
                        filterImages(category);
                    });
                    imageCard.appendChild(deleteBtn);
                }

                imageCard.appendChild(img);
                imageCard.appendChild(likeCount);
                imageCard.appendChild(likeBtn);
                gallery.appendChild(imageCard);
            });
        }
    }
}

searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});

// Live search as user types
searchInput.addEventListener('input', async (e) => {
    const searchTerm = e.target.value.trim().toLowerCase();
    
    if (searchTerm.length < 2) {
        hideSearchDropdown();
        return;
    }
    
    await showSearchDropdown(searchTerm);
});

// Hide dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-bar')) {
        hideSearchDropdown();
    }
});

// Create search dropdown if it doesn't exist
function getOrCreateSearchDropdown() {
    let dropdown = document.getElementById('searchResultsDropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'searchResultsDropdown';
        dropdown.className = 'search-results-dropdown';
        document.querySelector('.search-bar').appendChild(dropdown);
    }
    return dropdown;
}

function hideSearchDropdown() {
    const dropdown = document.getElementById('searchResultsDropdown');
    if (dropdown) {
        dropdown.classList.remove('active');
    }
}

// Show search dropdown with users and images
async function showSearchDropdown(searchTerm) {
    const dropdown = getOrCreateSearchDropdown();
    dropdown.innerHTML = '';
    
    // Search for users
    const { collection, getDocs } = window.firebaseDBFunctions;
    const usersSnapshot = await getDocs(collection(window.firebaseDB, 'users'));
    
    const matchingUsers = [];
    usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        const fullName = `${userData.firstName} ${userData.lastName}`.toLowerCase();
        const email = (userData.email || '').toLowerCase();
        
        if (fullName.includes(searchTerm) || email.includes(searchTerm)) {
            matchingUsers.push({ id: doc.id, ...userData });
        }
    });
    
    // Search for images
    const matchingImages = uploadedImages.filter(img =>
        img.name.toLowerCase().includes(searchTerm) ||
        img.category.toLowerCase().includes(searchTerm)
    ).slice(0, 5); // Limit to 5 images
    
    // Build dropdown content
    let html = '';
    
    if (matchingUsers.length > 0) {
        html += '<div class="search-section-title">Users</div>';
        matchingUsers.forEach(user => {
            html += `
                <div class="search-result-item" onclick="searchSelectUser('${user.id}')">
                    <img src="${user.avatar}" alt="${user.firstName}" class="search-result-avatar">
                    <div class="search-result-info">
                        <div class="search-result-name">${user.firstName} ${user.lastName}</div>
                        <div class="search-result-email">${user.email || ''}</div>
                    </div>
                </div>
            `;
        });
    }
    
    if (matchingImages.length > 0) {
        html += '<div class="search-section-title">Images</div>';
        matchingImages.forEach((image, index) => {
            const originalIndex = uploadedImages.indexOf(image);
            html += `
                <div class="search-result-item" onclick="searchSelectImage(${originalIndex})">
                    <img src="${image.url}" alt="${image.name}" class="search-result-image">
                    <div class="search-result-info">
                        <div class="search-result-name">${image.name}</div>
                        <div class="search-result-category">${image.category}</div>
                    </div>
                </div>
            `;
        });
    }
    
    if (html === '') {
        html = '<div class="search-result-item"><div class="search-result-info"><div class="search-result-name">No results found</div></div></div>';
    }
    
    dropdown.innerHTML = html;
    dropdown.classList.add('active');
}

// Handle user selection from search
async function searchSelectUser(userId) {
    hideSearchDropdown();
    searchInput.value = '';
    
    // Get user data and show profile
    const { doc, getDoc } = window.firebaseDBFunctions;
    const userDoc = await getDoc(doc(window.firebaseDB, 'users', userId));
    
    if (userDoc.exists()) {
        const userData = userDoc.data();
        showUserProfile(userId, userData);
    }
}

// Handle image selection from search
function searchSelectImage(index) {
    hideSearchDropdown();
    searchInput.value = '';
    openLightbox(index);
}

// Make search functions globally available
window.searchSelectUser = searchSelectUser;
window.searchSelectImage = searchSelectImage;

function performSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (!searchTerm) {
        displayImages();
        filterButtons.forEach(btn => btn.classList.remove('active'));
        filterButtons[0].classList.add('active');
        return;
    }
    gallery.innerHTML = '';
    const searchResults = uploadedImages.filter(img =>
        img.name.toLowerCase().includes(searchTerm) ||
        img.category.toLowerCase().includes(searchTerm)
    );
    if (searchResults.length === 0) {
        const noResults = document.createElement('div');
        noResults.style.cssText = 'grid-column:1/-1;text-align:center;padding:40px;font-family:K2D,sans-serif;font-size:18px;color:#666';
        noResults.textContent = `No images found for "${searchInput.value}"`;
        gallery.appendChild(noResults);
    } else {
        searchResults.forEach(image => {
            const imageCard = document.createElement('div');
            imageCard.className = 'image-card';
            const img = document.createElement('img');
            img.src = image.url;
            img.alt = image.name;
            img.className = 'uploaded-image';
            const originalIndex = uploadedImages.indexOf(image);
            img.addEventListener('click', () => openLightbox(originalIndex));
            img.style.cursor = 'pointer';

            // Like count
            const likeCount = document.createElement('div');
            likeCount.className = 'like-count';
            likeCount.textContent = image.likes || 0;
            likeCount.style.display = (image.likes && image.likes > 0) ? 'block' : 'none';

            // Like button
            const likeBtn = document.createElement('button');
            likeBtn.className = 'like-btn';
            const isLiked = currentUser && image.likedBy && image.likedBy.includes(currentUser.uid);
            if (isLiked) likeBtn.classList.add('liked');

            const heartIcon = document.createElement('img');
            heartIcon.src = 'heart.png';
            heartIcon.alt = 'Like';
            likeBtn.appendChild(heartIcon);

            likeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!currentUser) {
                    showPopup('You must be logged in to like images!', 'warning', 'Login Required');
                    return;
                }
                toggleLike(originalIndex, likeBtn, likeCount);
            });

            if (currentUser && (image.uploadedBy === currentUser.uid || isAdmin)) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.innerHTML = '×';
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (image.id) {
                        try {
                            const { doc, deleteDoc } = window.firebaseDBFunctions;
                            await deleteDoc(doc(window.firebaseDB, 'images', image.id));
                        } catch (error) {
                            console.error('Error deleting:', error);
                        }
                    }
                    uploadedImages.splice(originalIndex, 1);
                    performSearch();
                });
                imageCard.appendChild(deleteBtn);
            }

            imageCard.appendChild(img);
            imageCard.appendChild(likeCount);
            imageCard.appendChild(likeBtn);
            gallery.appendChild(imageCard);
        });
    }
}

// ========== AUTHENTICATION ==========
const authModal = document.getElementById('authModal');
const authClose = document.getElementById('authClose');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');

function initLoginButton() {
    const loginBtn = document.querySelector('.btn-secondary');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            authModal.classList.add('active');
            showLoginForm();
        });
    }
}

document.addEventListener('DOMContentLoaded', initLoginButton);
initLoginButton();

const loginFormElement = document.getElementById('loginFormElement');
const registerFormElement = document.getElementById('registerFormElement');
const forgotPasswordFormElement = document.getElementById('forgotPasswordFormElement');
const showRegisterLink = document.getElementById('showRegister');
const showLoginLink = document.getElementById('showLogin');
const showForgotPasswordLink = document.getElementById('showForgotPassword');
const backToLoginLink = document.getElementById('backToLogin');
const avatarUpload = document.getElementById('avatarUpload');
const avatarPreview = document.getElementById('avatarPreview');
let avatarDataURL = null;

avatarUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            avatarDataURL = e.target.result;
            avatarPreview.innerHTML = `<img src="${avatarDataURL}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
        };
        reader.readAsDataURL(file);
    }
});

authClose.addEventListener('click', () => authModal.classList.remove('active'));
document.querySelector('.auth-overlay').addEventListener('click', () => authModal.classList.remove('active'));

function showLoginForm() {
    if (loginForm && registerForm && forgotPasswordForm) {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        forgotPasswordForm.style.display = 'none';
    }
}

function showRegisterForm() {
    if (loginForm && registerForm && forgotPasswordForm) {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        forgotPasswordForm.style.display = 'none';
    }
}

function showForgotPasswordFormFunc() {
    if (loginForm && registerForm && forgotPasswordForm) {
        loginForm.style.display = 'none';
        registerForm.style.display = 'none';
        forgotPasswordForm.style.display = 'block';
    }
}

showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); showRegisterForm(); });
showLoginLink.addEventListener('click', (e) => { e.preventDefault(); showLoginForm(); });
showForgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); showForgotPasswordFormFunc(); });
backToLoginLink.addEventListener('click', (e) => { e.preventDefault(); showLoginForm(); });

function validatePassword(password) {
    return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
}

// REGISTER
registerFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstName = document.getElementById('registerFirstName').value.trim();
    const lastName = document.getElementById('registerLastName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

    if (password !== passwordConfirm) {
        showPopup('Passwords do not match!', 'error', 'Password Error');
        return;
    }
    if (!validatePassword(password)) {
        showPopup('Password must contain at least 8 characters, 1 uppercase letter and 1 number', 'warning', 'Invalid Password');
        return;
    }
    if (!avatarDataURL) {
        showPopup('Please choose a profile picture!', 'warning', 'Missing Photo');
        return;
    }

    try {
        const { createUserWithEmailAndPassword, sendEmailVerification } = window.firebaseAuthFunctions;
        const { doc, setDoc } = window.firebaseDBFunctions;
        const userCredential = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
        const user = userCredential.user;

        await setDoc(doc(window.firebaseDB, 'users', user.uid), {
            firstName, lastName, email,
            avatar: avatarDataURL,
            createdAt: new Date(),
            likedImages: [],
            uploadedImages: [],
            isPrivate: false
        });

        // Send verification email
        try {
            await sendEmailVerification(user);
            console.log('Verification email sent successfully to:', email);
            showPopup('A verification email has been sent to your email.', 'success', 'Welcome to PicUp!');
        } catch (emailError) {
            console.error('Could not send verification email:', emailError.code, emailError.message);
            showPopup('Your account has been created successfully!', 'success', 'Welcome to PicUp!');
        }

        registerFormElement.reset();
        avatarPreview.innerHTML = '<div class="avatar-placeholder">Choose an image</div>';
        avatarDataURL = null;
        
        // Close auth modal completely - user is now logged in
        authModal.classList.remove('active');
        
        // Reload to show logged-in state
        setTimeout(() => location.reload(), 1500);
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            showPopup('This email is already in use.', 'error', 'Email Taken');
        } else if (error.code === 'auth/invalid-email') {
            showPopup('Please enter a valid email address.', 'error', 'Invalid Email');
        } else if (error.code === 'auth/weak-password') {
            showPopup('Password is too weak.', 'error', 'Weak Password');
        } else {
            showPopup('Something went wrong: ' + error.message, 'error', 'Error');
        }
    }
});

// LOGIN
loginFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        const { signInWithEmailAndPassword } = window.firebaseAuthFunctions;
        await signInWithEmailAndPassword(window.firebaseAuth, email, password);
        authModal.classList.remove('active');
        location.reload();
    } catch (error) {
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            showPopup('Wrong email or password.', 'error', 'Login Failed');
        } else {
            showPopup('Login failed: ' + error.message, 'error', 'Login Failed');
        }
    }
});

// FORGOT PASSWORD
forgotPasswordFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value.trim();
    try {
        const { sendPasswordResetEmail } = window.firebaseAuthFunctions;
        await sendPasswordResetEmail(window.firebaseAuth, email);
        showPopup('A password reset link has been sent to:\n' + email, 'success', 'Email Sent');
        showLoginForm();
    } catch (error) {
        showPopup('Something went wrong: ' + error.message, 'error', 'Error');
    }
});

// ========== FIREBASE INITIALIZATION ==========
// Wait for Firebase to be ready, then load images
function initializeApp() {
    console.log('Initializing app...');
    
    // Check if Firebase is ready
    const checkFirebase = setInterval(() => {
        if (window.firebaseAuth && window.firebaseDB && window.firebaseAuthFunctions) {
            clearInterval(checkFirebase);
            console.log('Firebase is ready!');

            // Set up auth state listener
            const { onAuthStateChanged } = window.firebaseAuthFunctions;

            onAuthStateChanged(window.firebaseAuth, async (user) => {
                console.log('Auth state changed:', user ? user.uid : 'Not logged in');
                
                if (user) {
                    currentUser = user;
                    
                    // Check if user is admin
                    isAdmin = (user.email === ADMIN_EMAIL);
                    console.log('Is admin:', isAdmin);
                    
                    const { doc, getDoc } = window.firebaseDBFunctions;
                    const userDoc = await getDoc(doc(window.firebaseDB, 'users', user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        
                        // Check if account is deactivated
                        if (userData.isDeactivated && !isAdmin) {
                            showPopup('Your account has been deactivated.\n\nFor further information, please contact:\nHasso.mezhiev@gmail.com', 'error', 'Account Deactivated');
                            const { signOut } = window.firebaseAuthFunctions;
                            await signOut(window.firebaseAuth);
                            return;
                        }
                        
                        const navButtons = document.querySelector('.nav-buttons');
                        navButtons.innerHTML = `
                            <button class="btn-primary">Upload</button>
                            <button class="btn-logout-nav" id="logoutBtnNav">Log out</button>
                            <img src="${userData.avatar}" alt="Profile" class="user-avatar" id="userAvatar" style="width:40px;height:40px;border-radius:50%;cursor:pointer;object-fit:cover">
                        `;

                        // Add logout functionality to nav button
                        document.getElementById('logoutBtnNav').addEventListener('click', async () => {
                            const { signOut } = window.firebaseAuthFunctions;
                            await signOut(window.firebaseAuth);
                            location.reload();
                        });

                        document.querySelector('.btn-primary').addEventListener('click', () => {
                            if (!currentUser) {
                                showPopup('You must be logged in to upload images!');
                                return;
                            }
                            fileInput.click();
                        });

                        document.getElementById('userAvatar').addEventListener('click', () => {
                            showProfilePage();
                        });
                    }
                } else {
                    currentUser = null;
                    isAdmin = false;
                    const navButtons = document.querySelector('.nav-buttons');
                    navButtons.innerHTML = `
                        <button class="btn-signup">Sign Up</button>
                        <button class="btn-login">Login</button>
                    `;

                    // Add sign up button functionality
                    const signupBtn = document.querySelector('.btn-signup');
                    if (signupBtn) {
                        signupBtn.addEventListener('click', () => {
                            authModal.classList.add('active');
                            showRegisterForm();
                        });
                    }

                    // Add login button functionality
                    const loginBtn = document.querySelector('.btn-login');
                    if (loginBtn) {
                        loginBtn.addEventListener('click', () => {
                            authModal.classList.add('active');
                            showLoginForm();
                        });
                    }
                }

                // Load images for everyone (logged in or not)
                await loadImagesFromFirestore();
                
                // Load users for search
                await loadAllUsers();
                
                // If on profile page, refresh the galleries now that images are loaded
                if (profilePage && profilePage.style.display !== 'none') {
                    displayUploadedImages();
                    displayLikedImages();
                }
                
                // Restore page state AFTER images are loaded
                if (currentUser) {
                    const savedPage = localStorage.getItem('currentPage');
                    if (savedPage === 'profile') {
                        showProfilePage();
                    }
                }
            });
        }
    }, 100);

    // Fallback: Show placeholders after 3 seconds if Firebase takes too long
    setTimeout(() => {
        if (gallery && gallery.innerHTML === '') {
            console.log('Fallback: showing placeholders');
            displayImages();
            hideLoadingOverlay();
        }
    }, 3000);
}

// Start the app
initializeApp();

// ========== PROFILE PAGE ==========
const profilePage = document.getElementById('profilePage');
const mainContent = document.querySelector('.gallery-container');
const filterSection = document.querySelector('.filter-section');
const profileAvatar = document.getElementById('profileAvatar');
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const uploadedGallery = document.getElementById('uploadedGallery');
const likedGallery = document.getElementById('likedGallery');
const tabButtons = document.querySelectorAll('.tab-btn');

function showProfilePage() {
    mainContent.style.display = 'none';
    filterSection.style.display = 'none';
    profilePage.style.display = 'block';
    loadProfileData();
    localStorage.setItem('currentPage', 'profile');
    
    // Ensure galleries are refreshed after a short delay (in case images are still loading)
    setTimeout(() => {
        if (currentUser) {
            displayUploadedImages();
            displayLikedImages();
        }
    }, 500);
}

// Handle privacy toggle with buttons
const publicBtn = document.querySelector('.public-btn');
const privateBtn = document.querySelector('.private-btn');

if (publicBtn && privateBtn) {
    publicBtn.addEventListener('click', async () => {
        if (!currentUser) return;

        publicBtn.classList.add('active');
        privateBtn.classList.remove('active');

        try {
            const { doc, updateDoc } = window.firebaseDBFunctions;
            await updateDoc(doc(window.firebaseDB, 'users', currentUser.uid), {
                isPrivate: false
            });
            // Reload images
            await loadImagesFromFirestore();
        } catch (error) {
            console.error('Could not update privacy:', error);
        }
    });

    privateBtn.addEventListener('click', async () => {
        if (!currentUser) return;

        privateBtn.classList.add('active');
        publicBtn.classList.remove('active');

        try {
            const { doc, updateDoc } = window.firebaseDBFunctions;
            await updateDoc(doc(window.firebaseDB, 'users', currentUser.uid), {
                isPrivate: true
            });
            // Reload images
            await loadImagesFromFirestore();
        } catch (error) {
            console.error('Could not update privacy:', error);
        }
    });
}

function showMainPage() {
    mainContent.style.display = 'block';
    filterSection.style.display = 'block';
    profilePage.style.display = 'none';
    localStorage.setItem('currentPage', 'main');
}

// Load profile data
async function loadProfileData() {
    if (!currentUser) return;

    const { doc, getDoc } = window.firebaseDBFunctions;
    const userDoc = await getDoc(doc(window.firebaseDB, 'users', currentUser.uid));
    if (userDoc.exists()) {
        const userData = userDoc.data();
        profileAvatar.src = userData.avatar;
        
        // Show admin badge next to name if admin
        if (isAdmin) {
            profileName.innerHTML = `${userData.firstName} ${userData.lastName} <span class="admin-badge-small">ADMIN</span>`;
        } else {
            profileName.textContent = `${userData.firstName} ${userData.lastName}`;
        }
        
        profileEmail.textContent = userData.email;

        // Set privacy buttons
        if (userData.isPrivate) {
            publicBtn.classList.remove('active');
            privateBtn.classList.add('active');
        } else {
            publicBtn.classList.add('active');
            privateBtn.classList.remove('active');
        }

        displayUploadedImages();
        displayLikedImages();
        
        // Add delete account button if not admin
        if (!isAdmin) {
            addDeleteAccountButton();
        }
    }
}

// Add delete account button to profile (next to name)
function addDeleteAccountButton() {
    // Check if button already exists
    if (document.getElementById('deleteAccountBtn')) return;
    
    const profileDetails = document.querySelector('.profile-details');
    if (!profileDetails) return;
    
    const deleteSection = document.createElement('div');
    deleteSection.className = 'delete-account-section';
    deleteSection.innerHTML = `
        <button class="btn-delete-account" id="deleteAccountBtn">Delete Account</button>
    `;
    
    profileDetails.appendChild(deleteSection);
    
    // Add click event
    document.getElementById('deleteAccountBtn').addEventListener('click', confirmDeleteAccount);
}

// Confirm delete account
async function confirmDeleteAccount() {
    const confirmed = await showConfirm('Are you sure you want to delete your account?\n\nThis will permanently delete your profile and all your uploaded images.\n\nThis action cannot be undone!', 'Delete Account');
    
    if (confirmed) {
        deleteAccount();
    }
}

// Delete account and all user data
async function deleteAccount() {
    if (!currentUser) return;
    
    try {
        const { doc, deleteDoc, collection, getDocs, query, where, updateDoc, arrayRemove } = window.firebaseDBFunctions;
        
        // 1. Delete all images uploaded by this user
        const imagesQuery = query(
            collection(window.firebaseDB, 'images'),
            where('uploadedBy', '==', currentUser.uid)
        );
        const userImages = await getDocs(imagesQuery);
        
        for (const imageDoc of userImages.docs) {
            await deleteDoc(doc(window.firebaseDB, 'images', imageDoc.id));
        }
        console.log('Deleted', userImages.docs.length, 'images');
        
        // 2. Remove user's likes from all images
        const allImagesSnapshot = await getDocs(collection(window.firebaseDB, 'images'));
        for (const imageDoc of allImagesSnapshot.docs) {
            const imageData = imageDoc.data();
            if (imageData.likedBy && imageData.likedBy.includes(currentUser.uid)) {
                await updateDoc(doc(window.firebaseDB, 'images', imageDoc.id), {
                    likedBy: arrayRemove(currentUser.uid),
                    likes: (imageData.likes || 1) - 1
                });
            }
        }
        console.log('Removed user likes from images');
        
        // 3. Delete user document
        await deleteDoc(doc(window.firebaseDB, 'users', currentUser.uid));
        console.log('Deleted user document');
        
        // 4. Delete Firebase Auth account
        await currentUser.delete();
        console.log('Deleted auth account');
        
        showPopup('Your account has been deleted successfully.', 'success', 'Account Deleted');
        
        // Redirect to home after a short delay
        setTimeout(() => location.reload(), 2000);
        
    } catch (error) {
        console.error('Error deleting account:', error);
        
        if (error.code === 'auth/requires-recent-login') {
            showPopup('For security reasons, please log out and log in again before deleting your account.', 'warning', 'Re-login Required');
        } else {
            showPopup('Error deleting account: ' + error.message, 'error', 'Error');
        }
    }
}

// Show uploaded images - ONLY images uploaded by current user
function displayUploadedImages() {
    uploadedGallery.innerHTML = '';

    // Filter to show ONLY images uploaded by the current user
    const userImages = uploadedImages.filter(img => img.uploadedBy === currentUser.uid);

    if (userImages.length === 0) {
        uploadedGallery.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#666;">You haven\'t uploaded any images yet.</p>';
        return;
    }

    userImages.forEach((image) => {
        const imageCard = document.createElement('div');
        imageCard.className = 'image-card';

        const img = document.createElement('img');
        img.src = image.url;
        img.alt = image.name;
        img.className = 'uploaded-image';
        const originalIndex = uploadedImages.indexOf(image);
        img.addEventListener('click', () => openLightbox(originalIndex));
        img.style.cursor = 'pointer';

        imageCard.appendChild(img);
        uploadedGallery.appendChild(imageCard);
    });
}

// Show liked images - ONLY images that user has liked
function displayLikedImages() {
    likedGallery.innerHTML = '';

    // Filter to show ONLY images the user has liked
    const likedImages = uploadedImages.filter(img =>
        img.likedBy && img.likedBy.includes(currentUser.uid)
    );

    if (likedImages.length === 0) {
        likedGallery.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#666;">You haven\'t liked any images yet.</p>';
        return;
    }

    likedImages.forEach((image) => {
        const imageCard = document.createElement('div');
        imageCard.className = 'image-card';

        const img = document.createElement('img');
        img.src = image.url;
        img.alt = image.name;
        img.className = 'uploaded-image';
        const originalIndex = uploadedImages.indexOf(image);
        img.addEventListener('click', () => openLightbox(originalIndex));
        img.style.cursor = 'pointer';

        imageCard.appendChild(img);
        likedGallery.appendChild(imageCard);
    });
}

// Tab functionality
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tab = button.dataset.tab;

        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        if (tab === 'uploaded') {
            document.getElementById('uploadedTab').classList.add('active');
        } else {
            document.getElementById('likedTab').classList.add('active');
        }
    });
});

// Click PicUp logo to go to main page
const logoElement = document.querySelector('.logo');
if (logoElement) {
    logoElement.addEventListener('click', () => {
        showMainPage();
    });
    logoElement.style.cursor = 'pointer';
}

// Make functions globally available
window.viewUserProfile = viewUserProfile;
window.closeUserProfile = closeUserProfile;
window.toggleUserDeactivation = toggleUserDeactivation;
window.deleteUserAccount = deleteUserAccount;