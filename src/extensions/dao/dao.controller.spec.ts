import { Test, TestingModule } from '@nestjs/testing';
import { DAOController } from './dao.controller';

describe('DaoController', () => {
  let controller: DAOController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DAOController],
    }).compile();

    controller = module.get<DAOController>(DAOController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
