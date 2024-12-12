import LikeModel from "../models/like.js";
import Repository from "../models/repository.js";
import Controller from "./Controller.js";

export default class LikesController extends Controller {
  constructor(HttpContext) {
    super(HttpContext, new Repository(new LikeModel()));
  }

  add(data) {
    let userId = data.userId;
    let postId = data.postId;
    if (!userId || !postId) {
      this.HttpContext.response.badRequest({ message: "" });
      return;
    }

    if (this.repository != null) {
      try {
        const newLike = {
          UserId: userId,
          PostId: postId,
        };

        const addedLike = this.repository.add(newLike);

        if (this.repository.model.state.isValid) {
          this.HttpContext.response.created(addedLike);
        } else {
          if (this.repository.model.state.inConflict) {
            this.HttpContext.response.conflict(
              this.repository.model.state.errors
            );
          } else {
            this.HttpContext.response.badRequest(
              this.repository.model.state.errors
            );
          }
        }
      } catch (error) {
        console.error("Error adding like:", error);
      }
    } else {
      this.HttpContext.response.notImplemented();
    }
  }

  remove(data) {
    let userId = data.userId;
    let postId = data.postId;
    if (!userId || !postId) {
      this.HttpContext.response.badRequest({ data });
      return;
    }

    if (this.repository != null) {
      try {
        let likes = this.repository.findAllByField("PostId", postId);
        let likeToRemove = null;
        if (likes) {
          likeToRemove = likes.find((like) => like.UserId === userId);
        }
        if (likeToRemove) {
          this.repository.remove(likeToRemove.Id);
          if (this.repository.model.state.isValid) {
            this.HttpContext.response.noContent();
          } else {
            if (this.repository.model.state.inConflict) {
              this.HttpContext.response.conflict(
                this.repository.model.state.errors
              );
            } else {
              this.HttpContext.response.badRequest(
                this.repository.model.state.errors
              );
            }
          }
        } else {
          this.HttpContext.response.notFound({ message: "Like not found" });
        }
      } catch (error) {
        console.error("Error removing like:", error);
        this.HttpContext.response.internalServerError({
          message: "Error removing like",
        });
      }
    } else {
      this.HttpContext.response.notImplemented();
    }
  }

  count() {
    let postId = this.HttpContext.path.params.postId;

    if (!postId) {
      this.HttpContext.response.badRequest({ message: "PostId is required" });
      return;
    }

    if (this.repository != null) {
      try {
        const likes = this.repository.findAllByField("PostId", postId);
        let likesCount = 0;
        if (likes) {
          likesCount = likes.length;
        }
        this.HttpContext.response.JSON({ likesCount });
      } catch (error) {
        console.error("Error fetching likes count:", error);
      }
    } else {
      this.HttpContext.response.notImplemented();
    }
  }
  liked() {
    let userId = this.HttpContext.path.params.userId;
    let postId = this.HttpContext.path.params.postId;

    if (this.repository != null) {
      try {
        let likes = this.repository.findAllByField("PostId", postId);
        let userLike;
        if (likes) {
          userLike = likes.find((like) => like.PostId === postId);
        }
        if (userLike) {
          this.HttpContext.response.JSON({ liked: true });
        } else {
          this.HttpContext.response.JSON({ liked: false });
        }
      } catch (error) {
        console.error("Error fetching likes count:", error);
      }
    }
  }
}
