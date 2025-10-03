#include "neural_network.h"
#include <cmath>
#include <iostream>

// 활성화 함수 정의
double sigmoid(double x) { return 1.0 / (1.0 + exp(-x)); }
double sigmoid_derivative(double x) { return x * (1.0 - x); }

double relu(double x) { return x > 0 ? x : 0.0; }
double relu_derivative(double x) { return x > 0 ? 1.0 : 0.0; }

// -------- Neuron Implementation --------

Neuron::Neuron() : value(0.0), activated_value(0.0), derivative(0.0) {}

void Neuron::activate(const ActivationFunction& activation, const ActivationDerivative& derivative_func) {
    activated_value = activation(value);
    derivative = derivative_func(activated_value);
}

void Neuron::set_value(double val) {
    value = val;
}

double Neuron::get_value() const {
    return value;
}

double Neuron::get_activated_value() const {
    return activated_value;
}

double Neuron::get_derivative() const {
    return derivative;
}

// -------- Layer Implementation --------

Layer::Layer(int num_neurons, int num_inputs_per_neuron) {
    neurons.resize(num_neurons);
    weights.resize(num_neurons, std::vector<double>(num_inputs_per_neuron));
    biases.resize(num_neurons);

    // 가중치 및 편향 초기화
    for (auto& row : weights) {
        for (auto& weight : row) {
            weight = ((double)rand() / RAND_MAX) * 2 - 1; // -1 ~ 1 사이의 랜덤 값
        }
    }
    for (auto& bias : biases) {
        bias = ((double)rand() / RAND_MAX) * 2 - 1; // -1 ~ 1
    }
}

void Layer::feed_forward(const std::vector<Neuron>& prev_layer, const ActivationFunction& activation, const ActivationDerivative& derivative) {
    for (size_t i = 0; i < neurons.size(); ++i) {
        double sum = 0.0;
        for (size_t j = 0; j < prev_layer.size(); ++j) {
            sum += prev_layer[j].get_activated_value() * weights[i][j];
        }
        sum += biases[i];
        neurons[i].set_value(sum);
        neurons[i].activate(activation, derivative);
    }
}

void Layer::update_weights(const std::vector<Neuron>& prev_layer, double learning_rate) {
    for (size_t i = 0; i < neurons.size(); ++i) {
        for (size_t j = 0; j < prev_layer.size(); ++j) {
            weights[i][j] += learning_rate * neurons[i].get_derivative() * prev_layer[j].get_activated_value();
        }
        biases[i] += learning_rate * neurons[i].get_derivative();
    }
}

std::vector<Neuron>& Layer::get_neurons() {
    return neurons;
}

std::vector<std::vector<double>>& Layer::get_weights() {
    return weights;
}

std::vector<double>& Layer::get_biases() {
    return biases;
}

// -------- NeuralNetwork Implementation --------

NeuralNetwork::NeuralNetwork(const std::vector<int>& topology, const std::string& activation_function)
    : activation_function(activation_function) {
    initialize_activation_functions();

    for (size_t i = 0; i < topology.size(); ++i) {
        int num_inputs = (i == 0) ? 0 : topology[i - 1];
        layers.emplace_back(Layer(topology[i], num_inputs));
    }
}

void NeuralNetwork::initialize_activation_functions() {
    activation_map["sigmoid"] = sigmoid;
    derivative_map["sigmoid"] = sigmoid_derivative;

    activation_map["relu"] = relu;
    derivative_map["relu"] = relu_derivative;
}

void NeuralNetwork::feed_forward(const std::vector<double>& input_values) {
    auto& input_layer = layers[0].get_neurons();
    for (size_t i = 0; i < input_values.size(); ++i) {
        input_layer[i].set_value(input_values[i]);
    }

    for (size_t i = 1; i < layers.size(); ++i) {
        layers[i].feed_forward(layers[i - 1].get_neurons(), activation_map[activation_function], derivative_map[activation_function]);
    }
}

void NeuralNetwork::backpropagate(const std::vector<double>& target_values, double learning_rate) {
    // 출력 레이어 오차 계산
    auto& output_layer = layers.back();
    for (size_t i = 0; i < output_layer.get_neurons().size(); ++i) {
        double output = output_layer.get_neurons()[i].get_activated_value();
        double error = target_values[i] - output;
        output_layer.get_neurons()[i].set_value(error * output_layer.get_neurons()[i].get_derivative());
    }

    // 숨겨진 레이어 역전파
    for (int i = layers.size() - 2; i >= 0; --i) {
        auto& current_layer = layers[i];
        auto& next_layer = layers[i + 1];

        for (size_t j = 0; j < current_layer.get_neurons().size(); ++j) {
            double error = 0.0;
            for (size_t k = 0; k < next_layer.get_neurons().size(); ++k) {
                error += next_layer.get_weights()[k][j] * next_layer.get_neurons()[k].get_value();
            }
            current_layer.get_neurons()[j].set_value(error * current_layer.get_neurons()[j].get_derivative());
        }
    }

    // 가중치 및 편향 업데이트
    for (size_t i = 1; i < layers.size(); ++i) {
        layers[i].update_weights(layers[i - 1].get_neurons(), learning_rate);
    }
}

double NeuralNetwork::calculate_loss(const std::vector<double>& target_values, const std::string& loss_function) {
    const auto& output_layer = layers.back().get_neurons();
    double loss = 0.0;

    if (loss_function == "mse") {
        for (size_t i = 0; i < target_values.size(); ++i) {
            double error = target_values[i] - output_layer[i].get_activated_value();
            loss += error * error;
        }
        return loss / target_values.size();
    }

    throw std::invalid_argument("Unsupported loss function");
}

void NeuralNetwork::train(const std::vector<std::vector<double>>& training_data,
                          const std::vector<std::vector<double>>& target_data,
                          int epochs, double learning_rate) {
    for (int epoch = 0; epoch < epochs; ++epoch) {
        double total_loss = 0.0;

        for (size_t i = 0; i < training_data.size(); ++i) {
            feed_forward(training_data[i]);
            total_loss += calculate_loss(target_data[i]);
            backpropagate(target_data[i], learning_rate);
        }

        std::cout << "Epoch " << epoch + 1 << " Loss: " << total_loss / training_data.size() << std::endl;
    }
}

std::vector<double> NeuralNetwork::get_output_values() const {
    const auto& output_layer = layers.back().get_neurons();
    std::vector<double> output_values;
    for (const auto& neuron : output_layer) {
        output_values.push_back(neuron.get_activated_value());
    }
    return output_values;
}
