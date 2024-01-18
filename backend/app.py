from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from flask_cors import CORS  # Import the CORS module
from datetime import datetime

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///tasks.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
ma = Marshmallow()
ma.init_app(app)  # Initialize Marshmallow with the app after it has been created
CORS(app)

# Models
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.String(200))
    sort_field = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = db.Column(db.DateTime, nullable=True)


class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    task_comment = db.Column(db.String(200), nullable=False)
    task_id = db.Column(db.Integer, db.ForeignKey('task.id'), nullable=False)
    task = db.relationship('Task', backref='comments')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = db.Column(db.DateTime, nullable=True)


# Schemas
class TaskSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Task

    id = ma.auto_field()
    name = ma.auto_field()
    description = ma.auto_field()
    sort_field = ma.auto_field()
    created_at = ma.auto_field()
    updated_at = ma.auto_field()


class CommentSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Comment

    id = ma.auto_field()
    task_comment = ma.auto_field()
    task_id = ma.auto_field()
    created_at = ma.auto_field()
    updated_at = ma.auto_field()


task_schema = TaskSchema()
tasks_schema = TaskSchema(many=True)
comment_schema = CommentSchema()
comments_schema = CommentSchema(many=True)


# Routes
@app.route('/tasks', methods=['GET'])
def get_tasks():
    tasks = Task.query.all()
    return tasks_schema.jsonify(tasks)


@app.route('/tasks/<id>', methods=['GET'])
def get_task(id):
    task = Task.query.get(id)
    return task_schema.jsonify(task)


@app.route('/tasks', methods=['POST'])
def add_task():
    data = request.json

    new_task = Task(
        name=data['name'],
        description=data.get('description', ''),
        sort_field=data.get('sort_field', None)
    )

    db.session.add(new_task)
    db.session.commit()

    return task_schema.jsonify(new_task)


@app.route('/tasks/<id>', methods=['PUT'])
def update_task(id):
    task = Task.query.get(id)
    data = request.json

    task.name = data['name']
    task.description = data.get('description', '')
    task.sort_field = data.get('sort_field', None)

    db.session.commit()

    return task_schema.jsonify(task)


@app.route('/tasks/<id>', methods=['DELETE'])
def delete_task(id):
    task = Task.query.get(id)

    # Delete associated comments before deleting the task
    Comment.query.filter_by(task_id=task.id).delete()

    db.session.delete(task)
    db.session.commit()

    return task_schema.jsonify(task)


@app.route('/comments', methods=['GET'])
def get_comments():
    comments = Comment.query.all()
    return comments_schema.jsonify(comments)


@app.route('/comments/<id>', methods=['GET'])
def get_comment(id):
    comment = Comment.query.get(id)
    return comment_schema.jsonify(comment)


@app.route('/tasks/<task_id>/comments', methods=['POST'])
def add_comment(task_id):
    task = Task.query.get(task_id)
    data = request.json

    new_comment = Comment(
        task_comment=data['task_comment'],
        task=task
    )

    db.session.add(new_comment)
    db.session.commit()

    return comment_schema.jsonify(new_comment)

@app.route('/tasks/<task_id>/comments', methods=['GET'])
def get_task_comments(task_id):
    comments = Comment.query.filter_by(task_id=task_id).all()
    return comments_schema.jsonify(comments)


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
