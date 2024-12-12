////// Author: Nicolas Chourot
////// 2024
//////////////////////////////


const periodicRefreshPeriod = 10;
const waitingGifTrigger = 2000;
const minKeywordLenth = 3;
const keywordsOnchangeDelay = 500;

let sessionUser = JSON.parse(sessionStorage.getItem("user"));
let sessionToken = sessionStorage.getItem("token");
let categories = [];
let selectedCategory = "";
let currentETag = "";
let periodic_Refresh_paused = false;
let postsPanel;
let itemLayout;
let waiting = null;
let showKeywords = false;
let keywordsOnchangeTimger = null;

Init_UI();
async function Init_UI() {
    postsPanel = new PageManager('postsScrollPanel', 'postsPanel', 'postSample', renderPosts);
    $('#createPost').on("click", async function () {
        showCreatePostForm();
    });
    $('#abort').on("click", async function () {
        showPosts();
    });
    $('#aboutCmd').on("click", function () {
        showAbout();
    });
    $("#showSearch").on('click', function () {
        toogleShowKeywords();
        showPosts();
    });

    installKeywordsOnkeyupEvent();
    await showPosts();
    start_Periodic_Refresh();
}

/////////////////////////// Search keywords UI //////////////////////////////////////////////////////////

function installKeywordsOnkeyupEvent() {
    $("#searchKeys").on('keyup', function () {
        clearTimeout(keywordsOnchangeTimger);
        keywordsOnchangeTimger = setTimeout(() => {
            cleanSearchKeywords();
            showPosts(true);
        }, keywordsOnchangeDelay);
    });
    $("#searchKeys").on('search', function () {
        showPosts(true);
    });
}
function cleanSearchKeywords() {
    /* Keep only keywords of 3 characters or more */
    let keywords = $("#searchKeys").val().trim().split(' ');
    let cleanedKeywords = "";
    keywords.forEach(keyword => {
        if (keyword.length >= minKeywordLenth) cleanedKeywords += keyword + " ";
    });
    $("#searchKeys").val(cleanedKeywords.trim());
}
function showSearchIcon() {
    $("#hiddenIcon").hide();
    $("#showSearch").show();
    if (showKeywords) {
        $("#searchKeys").show();
    }
    else
        $("#searchKeys").hide();
}
function hideSearchIcon() {
    $("#hiddenIcon").show();
    $("#showSearch").hide();
    $("#searchKeys").hide();
}
function toogleShowKeywords() {
    showKeywords = !showKeywords;
    if (showKeywords) {
        $("#searchKeys").show();
        $("#searchKeys").focus();
    }
    else {
        $("#searchKeys").hide();
        showPosts(true);
    }
}

/////////////////////////// Views management ////////////////////////////////////////////////////////////

function intialView() {
    if (sessionUser && sessionUser.Authorizations && sessionUser.Authorizations.readAccess >= 2 && sessionUser.Authorizations.writeAccess >= 2) {
        $('#createPost').show();  
    } else {
        $('#createPost').hide();  
    }
    $("#hiddenIcon").hide();
    $("#hiddenIcon2").hide();
    $('#menu').show();
    $('#commit').hide();
    $('#abort').hide();
    $('#form').hide();
    $('#form').empty();
    $('#aboutContainer').hide();
    $('#errorContainer').hide();
    showSearchIcon();
}
async function showPosts(reset = false) {
    intialView();
    $("#viewTitle").text("Fil de nouvelles");
    periodic_Refresh_paused = false;
    await postsPanel.show(reset);
}
function hidePosts() {
    postsPanel.hide();
    hideSearchIcon();
    $("#createPost").hide();
    $('#menu').hide();
    periodic_Refresh_paused = true;
}
function showForm() {
    hidePosts();
    $('#form').show();
    $('#commit').show();
    $('#abort').show();
}
function showError(message, details = "") {
    hidePosts();
    $('#form').hide();
    $('#form').empty();
    $("#hiddenIcon").show();
    $("#hiddenIcon2").show();
    $('#commit').hide();
    $('#abort').show();
    $("#viewTitle").text("Erreur du serveur...");
    $("#errorContainer").show();
    $("#errorContainer").empty();
    $("#errorContainer").append($(`<div>${message}</div>`));
    $("#errorContainer").append($(`<div>${details}</div>`));
}
function showConnexionError(field, message) {
    $("#emailError").text("").hide();
    $("#passwordError").text("").hide();
    if (field === "Email") {
        $("#emailError").text(message).show();
    } else if (field === "Password") {
        $("#passwordError").text(message).show();
    }
}
function showCreatePostForm() {
    showForm();
    $("#viewTitle").text("Ajout de nouvelle");
    renderPostForm();
}
function showConnexionForm(message = null) {
    showForm();
    $('#commit').hide();
    $("#viewTitle").text("Connexion");
    renderConnexionForm(message);
}
function showAccountManagementForm() {
    showForm();
    $('#commit').hide();
    $("#viewTitle").text("Gestion d'usagers");
    renderUserManagementPage();
}
function showDeleteAccountForm() {
    showForm();
    $('#commit').hide();
    $("#viewTitle").text("Retrait de compte");
    renderDeleteAccountForm();
}
function showAccountCreationForm() {
    showForm();
    $('#commit').hide();
    $("#viewTitle").text("Inscription");
    renderAccountCreationForm(); 
}
function showEditAccountForm(user = null) {
    showForm();
    $('#commit').hide();
    $("#viewTitle").text("Modification de compte");
    renderAccountCreationForm(user); 
}
function showEditPostForm(id) {
    showForm();
    $("#viewTitle").text("Modification");
    renderEditPostForm(id);
}
function showDeletePostForm(id) {
    showForm();
    $("#viewTitle").text("Retrait");
    renderDeletePostForm(id);
}
function showAbout() {
    hidePosts();
    $("#hiddenIcon").show();
    $("#hiddenIcon2").show();
    $('#abort').show();
    $("#viewTitle").text("À propos...");
    $("#aboutContainer").show();
}

//////////////////////////// Posts rendering /////////////////////////////////////////////////////////////

//////////////////////////// Posts rendering /////////////////////////////////////////////////////////////

function start_Periodic_Refresh() {
    setInterval(async () => {
        if (!periodic_Refresh_paused) {
            let etag = await Posts_API.HEAD();
            if (currentETag != etag) {
                currentETag = etag;
                await showPosts();
            }
        }
    },
        periodicRefreshPeriod * 1000);
}
async function renderPosts(queryString) {
    let endOfData = false;
    queryString += "&sort=date,desc";
    compileCategories();
    if (selectedCategory != "") queryString += "&category=" + selectedCategory;
    if (showKeywords) {
        let keys = $("#searchKeys").val().replace(/[ ]/g, ',');
        if (keys !== "")
            queryString += "&keywords=" + $("#searchKeys").val().replace(/[ ]/g, ',')
    }
    addWaitingGif();
    let response = await Posts_API.Get(queryString);
    if (!Posts_API.error) {
        currentETag = response.ETag;
        let Posts = response.data;
        if (Posts.length > 0) {
            Posts.forEach(Post => {
                postsPanel.itemsPanel.append(renderPost(Post));
            });
        } else
            endOfData = true;
        linefeeds_to_Html_br(".postText");
        highlightKeywords();
        attach_Posts_UI_Events_Callback();
    } else {
        showError(Posts_API.currentHttpError);
    }
    removeWaitingGif();
    return endOfData;
}
function renderPost(post, loggedUser) {
    let date = convertToFrenchDate(UTC_To_Local(post.Date));
    let crudIcon = '';
    if (sessionUser && sessionUser.Authorizations && sessionUser.Authorizations.readAccess >= 2 && sessionUser.Authorizations.writeAccess >= 2) {
        crudIcon =
        `
        <span class="editCmd cmdIconSmall fa fa-pencil" style="margin-right: 10px" postId="${post.Id}" title="Modifier nouvelle"></span>
        <span class="deleteCmd cmdIconSmall fa fa-trash" style="margin-right: 10px" postId="${post.Id}" title="Effacer nouvelle"></span>
        `;
    }
    let likeIcon = '';
    let likeCount = 0;
    if (sessionUser && sessionUser.Authorizations && sessionUser.Authorizations.readAccess >= 1 && sessionUser.Authorizations.writeAccess >= 1) {
        Accounts_API.HasUserLikedPost(post.Id, sessionUser.Id).then(hasLiked => {
            if (hasLiked) {
                likeIcon = `
                <span class="removeLikeCmd cmdIconSmall fa fa-thumbs-up" postId="${post.Id}" title="Vous avez aimé cette publication"></span>
                <span class="likesCount" postId="${post.Id}">${likeCount}</span>
                `;
            } else {
                likeIcon = `
                <span class="addLikeCmd cmdIconSmall fa-regular fa-thumbs-up" postId="${post.Id}" title="Aimer cette publication"></span>
                <span class="likesCount" postId="${post.Id}">${likeCount}</span>
                `;
            }
           $(`#${post.Id} .postHeader`).append(likeIcon);
        });
    }
    Accounts_API.GetLikesCount(post.Id).then(likesCount => {
        if (likesCount !== null) {
            $(`#${post.Id} .likesCount`).text(likesCount); 
        } else {
            console.error('Failed to fetch likes count for post:', post.Id);
        }
    });
    return $(`
        <div class="post" id="${post.Id}">
            <div class="postHeader">
                ${post.Category}
                ${crudIcon}
                ${likeIcon}
            </div>
            <div class="postTitle"> ${post.Title} </div>
            <img class="postImage" src='${post.Image}'/>
            <div class="postDate"> ${date} </div>
            <div postId="${post.Id}" class="postTextContainer hideExtra">
                <div class="postText" >${post.Text}</div>
            </div>
            <div class="postfooter">
                <span postId="${post.Id}" class="moreText cmdIconXSmall fa fa-angle-double-down" title="Afficher la suite"></span>
                <span postId="${post.Id}" class="lessText cmdIconXSmall fa fa-angle-double-up" title="Réduire..."></span>
            </div>         
        </div>
    `);
}
async function compileCategories() {
    categories = [];
    let response = await Posts_API.GetQuery("?fields=category&sort=category");
    if (!Posts_API.error) {
        let items = response.data;
        if (items != null) {
            items.forEach(item => {
                if (!categories.includes(item.Category))
                    categories.push(item.Category);
            })
            if (!categories.includes(selectedCategory))
                selectedCategory = "";
            updateDropDownMenu(categories);
        }
    }
}
function updateDropDownMenu() {
    let DDMenu = $("#DDMenu");
    let selectClass = selectedCategory === "" ? "fa-check" : "fa-fw";
    DDMenu.empty();
    if (sessionUser) {
        let userManagementItem = "";

        if (sessionUser.Authorizations.readAccess === 3 && sessionUser.Authorizations.writeAccess === 3) {
            userManagementItem = `
                <div class="dropdown-item" id="userManagementCmd">
                    <i class="menuIcon fa fa-user-cog mx-2" id="userManagementCmd"></i> Gestion des usagers
                </div>
                <div class="dropdown-divider"></div>
            `;
        }
        console.log(sessionUser.Avatar);
        DDMenu.append(`
            <div class="dropdown-item"">
                <img id="userAvatar" src="${sessionUser.Avatar}" alt="User Avatar" class="UserAvatarXSmall">
                <span id="userName">${sessionUser.Name}</span>
            </div>
            <div class="dropdown-divider"></div>
            ${userManagementItem}
            <div class="dropdown-item" id="logoutCmd">
                <i class="menuIcon fa fa-sign-out mx-2" id="logoutCmd"></i> Deconnexion
            </div>
            <div class="dropdown-item" id="editProfileCmd">
                <i class="menuIcon fa fa-user-edit mx-2" id="editProfileCmd"></i> Modifier le profil
            </div>
            <div class="dropdown-divider"></div>
        `);

        $('#logoutCmd').on("click", async function () {
            if (sessionUser && sessionUser.Id) {
                let success = await Accounts_API.Logout(sessionUser.Id);
                if (success) {
                    sessionUser = null;
                    sessionToken = null;
                    sessionStorage.removeItem("user");
                    sessionStorage.removeItem("token");
                    showPosts(); 
                } else {
                    showError("Erreur", Accounts_API.currentHttpError);
                }
            } else {
                showError("Erreur", "Utilisateur introuvable.");
            }
        });

        $('#editProfileCmd').on("click", function () {
            if (sessionUser) {
                showEditAccountForm(sessionUser);
            } else {
                showError("Erreur", "Les informations utilisateur ne sont pas disponibles.");
            }
        });
        $('#userManagementCmd').on("click", function () {
            if (sessionUser) {
                showAccountManagementForm();
            } else {
                showError("Erreur", "Les informations utilisateur ne sont pas disponibles.");
            }
        });
    } else {
        DDMenu.append(`
            <div class="dropdown-item" id="loginCmd">
                <i class="menuIcon fa fa-sign-in mx-2"></i> Connexion
            </div>
            <div class="dropdown-divider"></div>
        `);
        $('#loginCmd').on("click", function () {
            showConnexionForm(); 
        });
    }
    DDMenu.append($(`<div class="dropdown-item menuItemLayout" id="allCatCmd">
                        <i class="menuIcon fa ${selectClass} mx-2"></i> Toutes les catégories
                    </div>
                    <div class="dropdown-divider"></div>
                    `));
    categories.forEach(category => {
        selectClass = selectedCategory === category ? "fa-check" : "fa-fw";
        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout category" id="allCatCmd">
                <i class="menuIcon fa ${selectClass} mx-2"></i> ${category}
            </div>
        `));
    })
    DDMenu.append($(`<div class="dropdown-divider"></div> `));
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="aboutCmd">
            <i class="menuIcon fa fa-info-circle mx-2"></i> À propos...
        </div>
        `));
    $('#aboutCmd').on("click", function () {
        showAbout();
    });
    $('#allCatCmd').on("click", async function () {
        selectedCategory = "";
        await showPosts(true);
        updateDropDownMenu();
    });
    $('.category').on("click", async function () {
        selectedCategory = $(this).text().trim();
        await showPosts(true);
        updateDropDownMenu();
    });
    $('#loginCmd').on("click", function () {
        showConnexionForm();
    });
}
function attach_Posts_UI_Events_Callback() {

    linefeeds_to_Html_br(".postText");
    $(".addLikeCmd").off();
    $(".addLikeCmd").on("click", function () {
        console.log("allo");
        const postId = $(this).attr("postId");
        const userId = sessionUser ? sessionUser.Id : null; 

        if (userId) {
            Accounts_API.AddLike(userId, postId)
                .then(response => {
                    if (response) {
                        console.log("Like added successfully!");
                    } else {
                        console.log("Failed to add like.");
                    }
                })
                .catch(() => {
                    alert("An error occurred while adding the like.");
                });
        }
    });
    $(".removeLikeCmd").off();
    $(".removeLikeCmd").on("click", function () {
        const postId = $(this).attr("postId");
        const userId = sessionUser ? sessionUser.Id : null; 
        
        if (userId) {
            Accounts_API.RemoveLike(userId, postId)
                .then(response => {
                    if (response) {
                        console.log("Like removed successfully!");
                    } else {
                        console.log("Failed to removed like.");
                    }
                })
                .catch(() => {
                    alert("An error occurred while removing the like.");
                });
        }
    });
    $(".editCmd").off();
    $(".editCmd").on("click", function () {
        showEditPostForm($(this).attr("postId"));
    });
    $(".deleteCmd").off();
    $(".deleteCmd").on("click", function () {
        showDeletePostForm($(this).attr("postId"));
    });
    $(".moreText").off();
    $(".moreText").click(function () {
        $(`.commentsPanel[postId=${$(this).attr("postId")}]`).show();
        $(`.lessText[postId=${$(this).attr("postId")}]`).show();
        $(this).hide();
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).addClass('showExtra');
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).removeClass('hideExtra');
    })
    $(".lessText").off();
    $(".lessText").click(function () {
        $(`.commentsPanel[postId=${$(this).attr("postId")}]`).hide();
        $(`.moreText[postId=${$(this).attr("postId")}]`).show();
        $(this).hide();
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).addClass('hideExtra');
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).removeClass('showExtra');
    })
}
function addWaitingGif() {
    clearTimeout(waiting);
    waiting = setTimeout(() => {
        postsPanel.itemsPanel.append($("<div id='waitingGif' class='waitingGifcontainer'><img class='waitingGif' src='Loading_icon.gif' /></div>'"));
    }, waitingGifTrigger)
}
function removeWaitingGif() {
    clearTimeout(waiting);
    $("#waitingGif").remove();
}

/////////////////////// Posts content manipulation ///////////////////////////////////////////////////////

function linefeeds_to_Html_br(selector) {
    $.each($(selector), function () {
        let postText = $(this);
        var str = postText.html();
        var regex = /[\r\n]/g;
        postText.html(str.replace(regex, "<br>"));
    })
}
function highlight(text, elem) {
    text = text.trim();
    if (text.length >= minKeywordLenth) {
        var innerHTML = elem.innerHTML;
        let startIndex = 0;

        while (startIndex < innerHTML.length) {
            var normalizedHtml = innerHTML.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            var index = normalizedHtml.indexOf(text, startIndex);
            let highLightedText = "";
            if (index >= startIndex) {
                highLightedText = "<span class='highlight'>" + innerHTML.substring(index, index + text.length) + "</span>";
                innerHTML = innerHTML.substring(0, index) + highLightedText + innerHTML.substring(index + text.length);
                startIndex = index + highLightedText.length + 1;
            } else
                startIndex = innerHTML.length + 1;
        }
        elem.innerHTML = innerHTML;
    }
}
function highlightKeywords() {
    if (showKeywords) {
        let keywords = $("#searchKeys").val().split(' ');
        if (keywords.length > 0) {
            keywords.forEach(key => {
                let titles = document.getElementsByClassName('postTitle');
                Array.from(titles).forEach(title => {
                    highlight(key, title);
                })
                let texts = document.getElementsByClassName('postText');
                Array.from(texts).forEach(text => {
                    highlight(key, text);
                })
            })
        }
    }
}

//////////////////////// Forms rendering /////////////////////////////////////////////////////////////////

function newAccount() {
    account = {};
    account.Id = 0;
    account.Email = "";
    account.Password = "";
    account.Name = "";
    account.Avatar = "";
    account.Created = 0;
    account.Authorizations = {};
    account.VerifyCode = ""
    return account;
}
function renderVerifyForm() {
    $("#form").show();
    $("#form").empty();
    
    $("#actionTitle").text("Vérification de compte");
    
    $("#form").append(`
        <form class="form" id="verifyForm">
            <div class="form-box">
                <label for="verificationCode" class="form-label">Code de vérification</label>
                <input 
                    class="form-control"
                    name="verificationCode"
                    id="verificationCode"
                    placeholder="Entrez le code de vérification"
                    required
                    RequireMessage="Veuillez entrer le code de vérification"
                    value=""
                />
            </div>
            
            <hr>
            
            <div class="form-buttons">
                <input type="submit" value="Vérifier" id="verifyAccount" class="btn btn-primary">
                <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">
            </div>
        </form>
    `);

    initFormValidation();

    $('#verifyForm').on("submit", async function (event) {
        event.preventDefault();

        let formData = getFormData($("#verifyForm"));
        let verificationCode = formData.verificationCode.trim();

        if (!verificationCode) {
            renderError("Veuillez entrer un code de vérification.");
            return;
        }

        let response = await Accounts_API.Verify(sessionUser.Id, verificationCode);
        if (!Accounts_API.error) {
            showPosts(); 
        } else {
            console.log(Accounts_API.currentHttpError);
            showError("Une erreur est survenue lors de la vérification.");
        }
    });

    $('#cancel').on("click", async function () {
        sessionUser = null;
        sessionToken = null;
        sessionStorage.removeItem("user");
        sessionStorage.removeItem("token");
        await showPosts();
    });
}
function renderUserManagementPage() {
    $("#form").show();
    $("#form").empty();
    
    $("#actionTitle").text("Gestion des usagers");

    $("#form").append(`
        <div class="user-management-container">
            <div class="user-grid">
                <div class="user-grid-header">Nom</div>
                <div class="user-grid-header">Email</div>
                <div class="user-grid-header">Autorisations</div>
                <div class="user-grid-header">Statut</div> 
                <div class="user-grid-header">Actions</div>
                <div id="userGridBody" class="user-grid-body">
                </div>
            </div>
        </div>
    `);

    Accounts_API.Get().then(users => {
        if (!users || users.length === 0) {
            $("#userGridBody").append(`
                <div class="user-grid-row">Aucun utilisateur trouvé.</div>
            `);
            return;
        }

        console.log(users.data);

        const sessionUserId = sessionUser.Id;

        const filteredUsers = users.data.filter(user => 
            !(user.Id === sessionUserId) && 
            !(user.Authorizations && user.Authorizations.writeAccess === 3 && user.Authorizations.readAccess === 3)
        );

        if (filteredUsers.length === 0) {
            $("#userGridBody").append(`
                <div class="user-grid-row">Aucun utilisateur non-admin trouvé.</div>
            `);
            return;
        }

        filteredUsers.forEach(user => {
            const authorizations = user.Authorizations
                ? `Lecture: ${user.Authorizations.readAccess}, Écriture: ${user.Authorizations.writeAccess}`
                : "Aucune";

            const status = (user.Authorizations.readAccess === -1 && user.Authorizations.writeAccess === -1) 
                ? '<span class="blocked">Blocked</span>' 
                : '<span class="active">Active</span>';

            $("#userGridBody").append(`
                <div class="user-grid-cell">${user.Name}</div>
                <div class="user-grid-cell">${user.Email}</div>
                <div class="user-grid-cell">${authorizations}</div>
                <div class="user-grid-cell">${status}</div>
                <div class="user-grid-cell">
                    <button class="btn btn-success promote-user" data-user='${JSON.stringify(user)}'>Promouvoir</button>
                    <button class="btn btn-warning block-user" data-user='${JSON.stringify(user)}'>${status === '<span class="blocked">Blocked</span>' ? 'Débloquer' : 'Bloquer'}</button>
                    <button class="btn btn-danger delete-user" data-user-id="${user.Id}">Supprimer</button>
                </div>
            `);
        });

        attachUserManagementHandlers();
    }).catch(error => {
        console.error("Erreur lors du chargement des utilisateurs:", error);
        renderError("Impossible de charger les utilisateurs.");
    });
}



function attachUserManagementHandlers() {
    $(".promote-user").on("click", async function () {
        const user = $(this).data("user"); 
        try {
            const response = await Accounts_API.Promote(user); 
            if (response) {
                alert(`Utilisateur ${user.Name} promu avec succès.`);
            } else {
                alert("Échec de la promotion de l'utilisateur.");
            }
        } catch (error) {
            console.error("Erreur lors de la promotion de l'utilisateur:", error);
            renderError("Une erreur est survenue lors de la promotion.");
        }
    });

    $(".block-user").on("click", async function () {
        const user = $(this).data("user");
        try {
            const response = await Accounts_API.block(user);
            if (response) {
                alert("Utilisateur bloqué avec succès.");
            } else {
                alert("Échec du blocage de l'utilisateur.");
            }
        } catch (error) {
            console.error("Erreur lors du blocage de l'utilisateur:", error);
            renderError("Une erreur est survenue lors du blocage.");
        }
    });

    $(".delete-user").on("click", async function () {
        const userIdToRemove = $(this).data("user-id");
        if (confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) {
            try {
                const response = await Accounts_API.Remove(userIdToRemove, sessionUser.Id);
                if (response) {
                    $(`#user-${userId}`).remove();
                    alert("Utilisateur supprimé avec succès.");
                } else {
                    alert("Échec de la suppression de l'utilisateur.");
                }
            } catch (error) {
                console.error("Erreur lors de la suppression de l'utilisateur:", error);
                renderError("Une erreur est survenue lors de la suppression.");
            }
        }
    });
}
function renderDeleteAccountForm() { 
    $("#form").show();
    $("#form").empty();
    
    $("#actionTitle").text("Vérification de compte");
    
    $("#form").append(`
        <form class="form" id="deleteAccountForm">
            <span class="viewTitle">Voulez-vous vraiment effacer votre compte?</span>

            <hr>
            
            <div class="form-buttons">
                <button class="btn btn-danger type="submit" id="deleteAccountBtn">Supprimer le compte</button>
                <button class="btn btn-secondary type="button" id="cancelBtn">Annuler</button>
            </div>
        </form>
    `);
  
    $('#deleteAccountForm').on("submit", async function(event) {
        event.preventDefault();

        let response = await Accounts_API.Remove(sessionUser.Id, sessionUser.Id);

        if (response) {
            sessionUser = null;
            sessionToken = null;
            sessionStorage.removeItem("user");
            sessionStorage.removeItem("token");
            showPosts(); 
        } else {
            renderError("Erreur lors de la suppression du compte. Vérifiez votre mot de passe.");
        }
    });

    $('#cancelBtn').on("click", function() {
       showPosts()
    });
}

function renderError(message) {
    $('#error-container').html(`<div class="error">${message}</div>`);
}

function showSuccess(message) {
    $('#success-container').html(`<div class="success">${message}</div>`);
}
function renderConnexionForm(message) {
    $("#form").show();
    $("#form").empty();
    $("#form").append(`
        <form class="form" id="connexionForm">
            <div class="form-group">
                <label for="Email" class="form-label">Email</label>
                <input 
                    type="email"
                    class="form-control"
                    name="Email"
                    id="Email"
                    placeholder="Email"
                    required
                    RequireMessage="Veuillez entrer un email"
                    InvalidMessage="Veuillez entrer un email valide"
                />
                <div id="emailError" class="text-danger" style="display: none;">Erreur pour l'email</div>
            </div>
            <div class="form-group">
                <label for="Password" class="form-label">Mot de passe</label>
                <input 
                    type="password"
                    class="form-control"
                    name="Password"
                    id="Password"
                    placeholder="Mot de passe"
                    required
                    RequireMessage="Veuillez entrer un mot de passe"
                    InvalidMessage="Le mot de passe est invalide"
                />
                <div id="passwordError" class="text-danger" style="display: none;">Erreur pour le mot de passe</div>
            </div>
            <div 
                id="formMessage" 
                class="alert alert-info" 
                style="display: ${message ? 'block' : 'none'};"
            >
                ${message || ''}
            </div>
            <input type="submit" value="Entrer" id="login" class="btn btn-primary">
            <hr>
            <button type="button" id="newAccount" class="btn btn-secondary">Nouveau compte</button>
        </form>
    `);

    initFormValidation();

    $('#connexionForm').on("submit", async function (event) {
        event.preventDefault();
        let formData = getFormData($("#connexionForm"));
    
        let response = await Accounts_API.Login(formData);
    
        if (!Accounts_API.error) {
            sessionStorage.setItem("user", JSON.stringify(response.User));
            sessionStorage.setItem("token", response.Access_token);

        
            sessionUser = JSON.parse(sessionStorage.getItem("user"));
            sessionToken = sessionStorage.getItem("token");
            console.log(sessionUser);
            if (sessionUser.VerifyCode !== "verified") {
                renderVerifyForm();
            } else {
                showPosts();
            }
        } else {
            if (Accounts_API.currentHttpError.includes("email")) {
                showConnexionError("Email", "L'adresse email est introuvable.");
            } else if (Accounts_API.currentHttpError.includes("password")) {
                showConnexionError("Password", "Le mot de passe est incorrect.");
            } else {
                showError("Erreur de connexion", Accounts_API.currentHttpError);
            }
        }
    });

    $('#newAccount').on("click", function () {
        showAccountCreationForm();
    });
}


function renderAccountCreationForm(account = null) {
    let create = account == null;
    if (create) {
        account = newAccount(); 
        account.Avatar = "no-avatar.png"; 
    }
    $("#form").show();
    $("#form").empty();
    $("#actionTitle").text(create ? "Création de compte" : "Modification de compte");
    $("#form").append(`
        <form class="form" id="accountForm">
            <input type="hidden" name="Id" value="${account.Id || ""}" />
            <input type="hidden" name="Authorizations" value="${account.Authorizations || ""}" />
            <input type="hidden" name="Created" value="${account.Created || ""}" />
            <input type="hidden" name="VerifyCode" value="${account.VerifyCode || ""}" />

            <div class="form-box">
                <label for="Email" class="form-label">Courriel</label>
                <input 
                    class="form-control Email"
                    name="Email" 
                    id="Email" 
                    placeholder="Courriel"
                    required
                    RequireMessage="Veuillez entrer un courriel" 
                    InvalidMessage="Veuillez entrer un courriel valide" 
                    CustomErrorMessage="Ce courriel est déjà utilisé"
                    value="${account.Email || ""}"
                />
                <label for="" class="form-label"></label>
                <input 
                    class="form-control Email MatchedInput" 
                    matchedInputId="Email"
                    name="ConfirmEmail" 
                    id="ConfirmEmail" 
                    placeholder="Confirmez le courriel"
                    required
                    RequireMessage="Veuillez confirmer le courriel"
                    InvalidMessage="Les courriels ne correspondent pas"
                    value="${account.Email || ""}" 
                />
            </div>

            <div class="form-box">
                <label for="Password" class="form-label">Mot de passe</label>
                <input 
                    class="form-control Password"
                    name="Password" 
                    id="Password" 
                    placeholder="Mot de passe"
                    required
                    RequireMessage="Veuillez entrer un mot de passe"
                    InvalidMessage="Le mot de passe est invalide" 
                    type="password"
                    value=""
                />
                <label for="" class="form-label"></label>
                <input 
                    class="form-control Password MatchedInput"
                    matchedInputId="Password"
                    name="ConfirmPassword" 
                    id="ConfirmPassword" 
                    placeholder="Confirmez le mot de passe"
                    required
                    RequireMessage="Veuillez confirmer le mot de passe"
                    InvalidMessage="Les mots de passe ne correspondent pas"
                    type="password"
                    value=""
                />
            </div>

            <div class="form-box">
                <label for="Name" class="form-label">Nom</label>
                <input 
                    class="form-control"
                    name="Name"
                    id="Name"
                    placeholder="Nom"
                    required
                    RequireMessage="Veuillez entrer un nom"
                    value="${account.Name || ""}"
                />
            </div>

            <div class="form-box">
                <label class="form-label">Avatar</label>
                <div class='imageUploader' 
                     newImage='${create}' 
                     controlId='Avatar' 
                     imageSrc='${account.Avatar}' 
                     waitingImage="Loading_icon.gif">
                </div>
            </div>
            <hr>

            <div class="form-buttons">
                <input type="submit" value="${create ? "Enregistrer" : "Modifier"}" id="saveAccount" class="btn btn-primary">
                ${create ? `
                <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">
                ` : `
                <input type="button" value="Supprimer le compte" id="deleteAccount" class="btn btn-danger">
                `}
            </div>
        </form>
    `);

    initImageUploaders();
    create ? addConflictValidation("http://localhost:5000/accounts/conflict", "Email", "saveAccount") : ""
    

    $('#accountForm').on("submit", async function (event) {
        event.preventDefault();

        let accountData = getFormData($("#accountForm"));

        delete accountData.ConfirmEmail;
        delete accountData.ConfirmPassword;

        if (create) {
            await Accounts_API.Register(accountData);
            if (!Accounts_API.error) {
                let message = "Votre compte a été créé. Veuillez vérifier vos courriels pour récupérer votre code de vérification.";
                showConnexionForm(message);
            } else {
                console.log(Accounts_API.currentHttpError);
                showError("Une erreur est survenue!");
            }
        } else {
            accountData['Authorizations'] = account.Authorizations;

            let response = await Accounts_API.Modify(accountData);
            sessionStorage.setItem("user", JSON.stringify(response));
            sessionUser = JSON.parse(sessionStorage.getItem("user"));
            if(sessionUser.VerifyCode != "verified"){
                sessionUser = null;
                sessionToken = null;
                sessionStorage.removeItem("user");
                sessionStorage.removeItem("token");
            }
           
            if (Accounts_API.error) {
                console.log(Accounts_API.currentHttpError);
                showError("Une erreur est survenue!");
            }
        }
    });

    $('#cancel').on("click", async function () {
        await showPosts();
    });

    $('#deleteAccount').on("click", async function () {
       showDeleteAccountForm();
    });
}

async function renderEditPostForm(id) {
    $('#commit').show();
    addWaitingGif();
    let response = await Posts_API.Get(id)
    if (!Posts_API.error) {
        let Post = response.data;
        if (Post !== null)
            renderPostForm(Post);
        else
            showError("Post introuvable!");
    } else {
        showError(Posts_API.currentHttpError);
    }
    removeWaitingGif();
}
async function renderDeletePostForm(id) {
    let response = await Posts_API.Get(id)
    if (!Posts_API.error) {
        let post = response.data;
        if (post !== null) {
            let date = convertToFrenchDate(UTC_To_Local(post.Date));
            $("#form").append(`
                <div class="post" id="${post.Id}">
                <div class="postHeader">  ${post.Category} </div>
                <div class="postTitle ellipsis"> ${post.Title} </div>
                <img class="postImage" src='${post.Image}'/>
                <div class="postDate"> ${date} </div>
                <div class="postTextContainer showExtra">
                    <div class="postText">${post.Text}</div>
                </div>
            `);
            linefeeds_to_Html_br(".postText");
            // attach form buttons click event callback
            $('#commit').on("click", async function () {
                await Posts_API.Delete(post.Id);
                if (!Posts_API.error) {
                    await showPosts();
                }
                else {
                    console.log(Posts_API.currentHttpError)
                    showError("Une erreur est survenue!");
                }
            });
            $('#cancel').on("click", async function () {
                await showPosts();
            });

        } else {
            showError("Post introuvable!");
        }
    } else
        showError(Posts_API.currentHttpError);
}
function newPost() {
    let Post = {};
    Post.Id = 0;
    Post.Title = "";
    Post.Text = "";
    Post.Image = "news-logo-upload.png";
    Post.Category = "";
    return Post;
}
function renderPostForm(post = null) {
    let create = post == null;
    if (create) post = newPost();
    $("#form").show();
    $("#form").empty();
    $("#form").append(`
        <form class="form" id="postForm">
            <input type="hidden" name="Id" value="${post.Id}"/>
             <input type="hidden" name="Date" value="${post.Date}"/>
            <label for="Category" class="form-label">Catégorie </label>
            <input 
                class="form-control"
                name="Category"
                id="Category"
                placeholder="Catégorie"
                required
                value="${post.Category}"
            />
            <label for="Title" class="form-label">Titre </label>
            <input 
                class="form-control"
                name="Title" 
                id="Title" 
                placeholder="Titre"
                required
                RequireMessage="Veuillez entrer un titre"
                InvalidMessage="Le titre comporte un caractère illégal"
                value="${post.Title}"
            />
            <label for="Url" class="form-label">Texte</label>
             <textarea class="form-control" 
                          name="Text" 
                          id="Text"
                          placeholder="Texte" 
                          rows="9"
                          required 
                          RequireMessage = 'Veuillez entrer une Description'>${post.Text}</textarea>

            <label class="form-label">Image </label>
            <div class='imageUploaderContainer'>
                <div class='imageUploader' 
                     newImage='${create}' 
                     controlId='Image' 
                     imageSrc='${post.Image}' 
                     waitingImage="Loading_icon.gif">
                </div>
            </div>
            <div id="keepDateControl">
                <input type="checkbox" name="keepDate" id="keepDate" class="checkbox" checked>
                <label for="keepDate"> Conserver la date de création </label>
            </div>
            <input type="submit" value="Enregistrer" id="savePost" class="btn btn-primary displayNone">
        </form>
    `);
    if (create) $("#keepDateControl").hide();

    initImageUploaders();
    initFormValidation(); // important do to after all html injection!

    $("#commit").click(function () {
        $("#commit").off();
        return $('#savePost').trigger("click");
    });
    $('#postForm').on("submit", async function (event) {
        event.preventDefault();
        let post = getFormData($("#postForm"));
        if (post.Category != selectedCategory)
            selectedCategory = "";
        if (create || !('keepDate' in post))
            post.Date = Local_to_UTC(Date.now());
        delete post.keepDate;
        post = await Posts_API.Save(post, create);
        if (!Posts_API.error) {
            await showPosts();
            postsPanel.scrollToElem(post.Id);
        }
        else
            showError("Une erreur est survenue! ", Posts_API.currentHttpError);
    });
    $('#cancel').on("click", async function () {
        await showPosts();
    });
}
function getFormData($form) {
    // prevent html injections
    const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
    var jsonObject = {};
    // grab data from all controls
    $.each($form.serializeArray(), (index, control) => {
        jsonObject[control.name] = control.value.replace(removeTag, "");
    });
    return jsonObject;
}
