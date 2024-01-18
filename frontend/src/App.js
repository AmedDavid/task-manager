import React, { useState } from 'react';
import {
  useQuery,
  useMutation,
  QueryClient,
  QueryClientProvider,
} from 'react-query';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Button, Card, Form, Modal } from 'react-bootstrap';
import { FaTrash } from 'react-icons/fa';
// import { SortableTask } from './Task';

const queryClient = new QueryClient();

const fetchTasks = async () => {
  const response = await fetch('http://localhost:5000/tasks');
  return response.json();
};

const createTask = async (newTask) => {
  const response = await fetch('http://localhost:5000/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newTask),
  });
  return response.json();
};

const deleteTask = async (id) => {
  const response = await fetch(`http://localhost:5000/tasks/${id}`, {
    method: 'DELETE',
  });
  return response.json();
};

const updateTask = async (id, updatedTask) => {
  const response = await fetch(`http://localhost:5000/tasks/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updatedTask),
  });
  return response.json();
};

const addComment = async (task_id, comment) => {
  const response = await fetch(`http://localhost:5000/tasks/${task_id}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ task_comment: comment }),
  });
  return response.json();
};

const fetchComments = async (taskId) => {
  const response = await fetch(`http://localhost:5000/tasks/${taskId}/comments`);
  return response.json();
};

const Task = ({ task, onDelete, onUpdate, onViewDetails, index }) => {
  const [comment, setComment] = useState('');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [updatedTaskName, setUpdatedTaskName] = useState('');
  const [updatedTaskDescription, setUpdatedTaskDescription] = useState('');
  const { data: comments, refetch: refetchComments } = useQuery(`comments_${task.id}`, () => fetchComments(task.id));

  const handleAddComment = async () => {
    if (comment.trim() !== '') {
      await addComment(task.id, comment);
      setComment('');
      refetchComments();
    }
  };

  const handleUpdateTask = async () => {
    const updatedTask = {
      name: updatedTaskName !== '' ? updatedTaskName : task.name,
      description: updatedTaskDescription !== '' ? updatedTaskDescription : task.description,
    };

    await updateTask(task.id, updatedTask);
    refetchComments();
    setShowCommentModal(false);
  };

  const handleViewDetails = async (task) => {
    setUpdatedTaskName(task.name);
    setUpdatedTaskDescription(task.description);
    setShowCommentModal(true);
  };

  return (
    <Card style={{ marginBottom: '10px' }}>
      <Card.Header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #dee2e6' }}>
        <div style={{ textAlign: 'center', flex: 1 }}>{`${task.name} - Display Order: ${index + 1}`}</div>
        <Button variant="danger" onClick={() => onDelete(task.id)}><FaTrash /></Button>
      </Card.Header>
      <Card.Body>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Button variant="secondary" onClick={() => handleViewDetails(task)}>
            View Details
          </Button>
        </div>
      </Card.Body>

      <Modal show={showCommentModal} onHide={() => setShowCommentModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>View Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="formTaskName">
              <Form.Label>Task Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Task Name"
                value={updatedTaskName}
                onChange={(e) => setUpdatedTaskName(e.target.value)}
              />
            </Form.Group>
            <Form.Group controlId="formTaskDescription">
              <Form.Label>Task Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Task Description"
                value={updatedTaskDescription}
                onChange={(e) => setUpdatedTaskDescription(e.target.value)}
              />
              <Button variant="primary" onClick={handleUpdateTask}>
                Update
              </Button>
            </Form.Group>

            {/* Comment Section */}
            <p><strong>Comments:</strong></p>
            {comments && comments.map((comment) => (
              <p key={comment.id}>{comment.task_comment}</p>
            ))}
            
            <Form.Group controlId={`comment_${task.id}`}>
              <Form.Label>Enter your comment</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Enter your comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCommentModal(false)}>
            Close
          </Button>
          <Button variant="success" onClick={handleAddComment}>
            Add Comment
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

const TaskList = ({ tasks, onDelete, onUpdate, onAddComment, onDragEnd, onViewDetails }) => {
  return (
    <DndContext
      sensors={useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={tasks.map((task) => task.id)}>
        <div>
          {tasks.map((task, index) => (
            <Task
              key={task.id}
              task={task}
              onDelete={onDelete}
              onUpdate={onUpdate}
              onAddComment={onAddComment}
              onViewDetails={onViewDetails}
              index={index}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};


const App = () => {
  const [showModal, setShowModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [updateModalShow, setUpdateModalShow] = useState(false);
  const [updatedTaskName, setUpdatedTaskName] = useState('');
  const [updatedTaskDescription, setUpdatedTaskDescription] = useState('');

  const { data: tasks, refetch } = useQuery('tasks', fetchTasks);

  const deleteTaskMutation = useMutation(deleteTask, {
    onSuccess: () => {
      refetch();
    },
  });

  const addTaskMutation = useMutation(createTask, {
    onSuccess: () => {
      refetch();
    },
  });

  const updateTaskMutation = useMutation(updateTask, {
    onSuccess: () => {
      refetch();
      setUpdateModalShow(false);
    },
  });

  const reorderTasksMutation = useMutation(arrayMove, {
    onSuccess: (reorderedTasks, variables, context) => {
      console.log('Reorder Mutation Success:', reorderedTasks);
      const taskIds = reorderedTasks.map((task) => task.id);
      fetch(`http://localhost:5000/tasks/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskIds),
      }).then(() => refetch());
    },
  });

  const handleAddTask = async () => {
    await addTaskMutation.mutateAsync({ name: newTaskName, description: newTaskDescription });
    handleCloseModal();
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNewTaskName('');
    setNewTaskDescription('');
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await deleteTaskMutation.mutateAsync(taskId);
    }
  };

  const handleUpdateTaskDetails = async () => {
    const updatedTask = {
      name: updatedTaskName !== '' ? updatedTaskName : selectedTask.name,
      description: updatedTaskDescription !== '' ? updatedTaskDescription : selectedTask.description,
    };

    await updateTaskMutation.mutateAsync({ id: selectedTask.id, updatedTask });
  };

  const handleUpdateTask = async (taskId) => {
    const taskToUpdate = tasks.find(task => task.id === taskId);
    setUpdatedTaskName(taskToUpdate.name);
    setUpdatedTaskDescription(taskToUpdate.description);
    setSelectedTask(taskToUpdate);
    setShowModal(true);
  };

  const handleDragEnd = async ({ active, over }) => {
    console.log('Active:', active);
    console.log('Over:', over);
  
    if (active.id !== over.id) {
      const oldIndex = tasks.findIndex((task) => task.id === active.id);
      const newIndex = tasks.findIndex((task) => task.id === over.id);
  
      console.log('Old Index:', oldIndex);
      console.log('New Index:', newIndex);
  
      const reorderedTasks = arrayMove([...tasks], oldIndex, newIndex);
      console.log('Reordered Tasks:', reorderedTasks);
  
      reorderTasksMutation.mutate(reorderedTasks);
    }
  };  

  const handleAddComment = async () => {
    refetch();
  };

  const handleViewDetails = (task) => {
    setSelectedTask(task);
    setUpdateModalShow(true);
    setUpdatedTaskName(task.name);
    setUpdatedTaskDescription(task.description);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ textAlign: 'center' }}>Task Manager</h1>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Button variant="success" onClick={() => setShowModal(true)}>
          Create New Task
        </Button>
      </div>

      {/* New Task Modal */}
      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create New Task</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="formTaskName">
              <Form.Label>Task Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter task name"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
              />
            </Form.Group>
            <Form.Group controlId="formTaskDescription">
              <Form.Label>Task Description</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter task description"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Close
          </Button>
          <Button variant="primary" onClick={handleAddTask}>
            Create
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Update Task Modal */}
      <Modal show={updateModalShow} onHide={() => setUpdateModalShow(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Update Task</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="formTaskName">
              <Form.Label>Task Name</Form.Label>
              <Form.Control
                type="text"
                value={updatedTaskName}
                onChange={(e) => setUpdatedTaskName(e.target.value)}
              />
            </Form.Group>
            <Form.Group controlId="formTaskDescription">
              <Form.Label>Task Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={updatedTaskDescription}
                onChange={(e) => setUpdatedTaskDescription(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setUpdateModalShow(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={handleUpdateTaskDetails}>
            Update Task
          </Button>
        </Modal.Footer>
      </Modal>

      {tasks && (
        <TaskList
          tasks={tasks}
          onDelete={handleDeleteTask}
          onUpdate={handleUpdateTask}
          onAddComment={handleAddComment}
          onDragEnd={handleDragEnd}
          onViewDetails={handleViewDetails}
        />
      )}
    </div>
  );
};

const AppWrapper = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
};

export default AppWrapper;
